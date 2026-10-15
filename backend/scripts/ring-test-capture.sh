#!/usr/bin/env bash
# Local dev helper: wake a Ring demo/Playground device (no real motion event
# coming in), pull a snapshot through this app's own test-capture endpoint,
# then close the WHEP session.
#
# Why: downloadSnapshot() in RingService.php only looks at the last 30s of
# device media (media/image/download, type=latest_in_range). A Playground
# device that's been idle has nothing in that window and 416s. Opening a
# WHEP live session (even with a throwaway, non-negotiated SDP offer) makes
# Ring treat the device as actively streaming, which populates that buffer.
#
# Usage:
#   ./scripts/ring-test-capture.sh <device_id> <app_bearer_token> [base_url] [out_dir]
#
#   device_id       Ring device id (ava1.ring.device....)
#   app_bearer_token  Sanctum token for a logged-in app user (any role) —
#                     NOT the Ring access token. Mint one locally with:
#                     php artisan tinker --execute="echo \App\Models\User::find(1)->createToken('t')->plainTextToken;"
#   base_url        This app's API base (default: http://localhost:8088/api)
#   out_dir         Folder to save captured snapshots into (default:
#                     backend/storage/ring-test-captures)
#
# Reads RING_ACCESS_TOKEN from backend/.env (run from backend/ or anywhere —
# path is resolved relative to this script).

set -euo pipefail

DEVICE_ID="${1:?device_id required}"
APP_TOKEN="${2:?app bearer token required}"
BASE_URL="${3:-http://localhost:8088/api}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
OUT_DIR="${4:-$SCRIPT_DIR/../storage/ring-test-captures}"
mkdir -p "$OUT_DIR"

RING_TOKEN="$(grep '^RING_ACCESS_TOKEN=' "$ENV_FILE" | cut -d= -f2-)"
if [[ -z "$RING_TOKEN" ]]; then
  echo "RING_ACCESS_TOKEN not set in $ENV_FILE" >&2
  exit 1
fi

OFFER_FILE="$(mktemp)"
trap 'rm -f "$OFFER_FILE"' EXIT

cat > "$OFFER_FILE" << 'EOF'
v=0
o=- 46117317 2 IN IP4 127.0.0.1
s=-
t=0 0
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=mid:video
a=recvonly
a=rtcp-mux
a=rtpmap:96 H264/90000
EOF

echo "==> Opening WHEP session to wake device..."
WHEP_HEADERS="$(mktemp)"
trap 'rm -f "$OFFER_FILE" "$WHEP_HEADERS"' EXIT

HTTP_STATUS=$(curl -s -o /dev/null -D "$WHEP_HEADERS" -w "%{http_code}" -X POST \
  "https://api.amazonvision.com/v1/devices/${DEVICE_ID}/media/streaming/whep/sessions" \
  -H "Authorization: Bearer ${RING_TOKEN}" \
  -H "Content-Type: application/sdp" \
  --data-binary "@${OFFER_FILE}")

if [[ "$HTTP_STATUS" != "201" ]]; then
  echo "WHEP session open failed (HTTP $HTTP_STATUS)" >&2
  exit 1
fi

SESSION_URL="$(grep -i '^location:' "$WHEP_HEADERS" | sed 's/^[Ll]ocation: *//' | tr -d '\r')"
echo "    session: $SESSION_URL"

echo "==> Pulling snapshot via app test-capture endpoint..."
RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$OFFER_FILE" "$WHEP_HEADERS" "$RESPONSE_FILE"' EXIT

HTTP_STATUS=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" -X POST \
  "${BASE_URL}/ring/devices/${DEVICE_ID}/test-capture" \
  -H "Authorization: Bearer ${APP_TOKEN}" \
  -H "Accept: application/json")

echo "    HTTP_STATUS: $HTTP_STATUS"

STAMP="$(date +%Y%m%d-%H%M%S)"
SAVED_PATH="$OUT_DIR/capture-${STAMP}.jpg"

php -r '
$body = json_decode(file_get_contents($argv[1]), true);
if (!$body || empty($body["success"])) {
    fwrite(STDERR, "    message: " . ($body["message"] ?? "unknown error") . "\n");
    exit(1);
}
echo "    qr_result: " . ($body["qr_result"] ?? "null") . "\n";
$dataUri = $body["image_base64"] ?? "";
$comma = strpos($dataUri, ",");
if ($comma === false) {
    fwrite(STDERR, "    no image_base64 in response\n");
    exit(1);
}
file_put_contents($argv[2], base64_decode(substr($dataUri, $comma + 1)));
echo "    saved: " . $argv[2] . "\n";
' "$RESPONSE_FILE" "$SAVED_PATH" || true

echo "==> Closing WHEP session..."
curl -s -o /dev/null -w "    closed: %{http_code}\n" -X DELETE "$SESSION_URL" \
  -H "Authorization: Bearer ${RING_TOKEN}"
