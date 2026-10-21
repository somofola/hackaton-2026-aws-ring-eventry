import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Video, Plus, Loader2, Trash2, Unlink, Check, X, KeyRound, Send, Copy, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  RingDevice,
  RingDeviceRequest,
  RingEventOption,
  RingPlatformCredentialStatus,
  RingOwnerCredentialStatus,
  fetchAllRingDevices,
  createRingDevice,
  updateRingDevice,
  deleteRingDevice,
  assignRingDeviceToEvent,
  fetchAllRingDeviceRequests,
  fulfillRingDeviceRequest,
  rejectRingDeviceRequest,
  fetchRingEventOptions,
  fetchRingPlatformCredentials,
  saveRingPlatformCredentials,
  fetchMyRingDevices,
  onboardMyRingDevice,
  fetchMyRingDeviceRequests,
  requestRingDevice,
  fetchMyRingCredentials,
  saveMyRingCredentials,
} from "@/services/ringDeviceService";
import { fetchEvents } from "@/services/eventService";
import { Event } from "@/types";

// ── "Device Pool" tab — platform-wide registry, assignment queue, shared
//    platform Ring Developer credentials. Formerly the entire admin page. ──
const DevicePoolTab = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<RingDevice[]>([]);
  const [requests, setRequests] = useState<RingDeviceRequest[]>([]);
  const [eventOptions, setEventOptions] = useState<RingEventOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [newDeviceId, setNewDeviceId] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);

  const [busyId, setBusyId] = useState<number | null>(null);

  const [editDevice, setEditDevice] = useState<RingDevice | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [fulfillChoice, setFulfillChoice] = useState<Record<number, string>>({});
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);

  const [credStatus, setCredStatus] = useState<RingPlatformCredentialStatus | null>(null);
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credAccessToken, setCredAccessToken] = useState("");
  const [credClientId, setCredClientId] = useState("");
  const [credClientSecret, setCredClientSecret] = useState("");
  const [credHmacSecret, setCredHmacSecret] = useState("");
  const [credPartnerId, setCredPartnerId] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, r, e, creds] = await Promise.all([
        fetchAllRingDevices(),
        fetchAllRingDeviceRequests(),
        fetchRingEventOptions(),
        fetchRingPlatformCredentials(),
      ]);
      setDevices(d);
      setRequests(r);
      setEventOptions(e);
      setCredStatus(creds);
      setCredClientId(creds.client_id || "");
      setCredPartnerId(creds.partner_account_identifier || "");
    } catch {
      toast({ title: "Failed to load Ring devices", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newDeviceId || !newName) return;
    setCreating(true);
    try {
      await createRingDevice({ device_id: newDeviceId, name: newName, location: newLocation || undefined });
      setNewDeviceId("");
      setNewName("");
      setNewLocation("");
      toast({ title: "Device onboarded" });
      await loadAll();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not onboard device";
      toast({ title: "Failed", description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (device: RingDevice) => {
    setEditDevice(device);
    setEditName(device.name);
    setEditLocation(device.location || "");
  };

  const handleSaveEdit = async () => {
    if (!editDevice || !editName) return;
    setSavingEdit(true);
    try {
      await updateRingDevice(editDevice.id, { name: editName, location: editLocation || undefined });
      toast({ title: "Device updated" });
      setEditDevice(null);
      await loadAll();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not update device";
      toast({ title: "Failed", description: message, variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (device: RingDevice) => {
    setBusyId(device.id);
    try {
      await deleteRingDevice(device.id);
      toast({ title: "Device removed" });
      await loadAll();
    } catch {
      toast({ title: "Failed to remove device", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const applyAssignment = async (deviceId: number, eventId: number | null) => {
    setBusyId(deviceId);
    try {
      await assignRingDeviceToEvent(deviceId, eventId);
      toast({ title: eventId ? "Device assigned to event" : "Device unassigned" });
      await loadAll();
    } catch {
      toast({ title: "Failed to update assignment", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleFulfill = async (request: RingDeviceRequest) => {
    const choice = fulfillChoice[request.id];
    if (!choice) {
      toast({ title: "Pick a device to fulfill this request with", variant: "destructive" });
      return;
    }
    setBusyRequestId(request.id);
    try {
      await fulfillRingDeviceRequest(request.id, Number(choice));
      toast({ title: "Request fulfilled" });
      await loadAll();
    } catch {
      toast({ title: "Failed to fulfill request", variant: "destructive" });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleReject = async (request: RingDeviceRequest) => {
    setBusyRequestId(request.id);
    try {
      await rejectRingDeviceRequest(request.id);
      toast({ title: "Request rejected" });
      await loadAll();
    } catch {
      toast({ title: "Failed to reject request", variant: "destructive" });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleSavePlatformCredentials = async () => {
    setSavingCreds(true);
    try {
      await saveRingPlatformCredentials({
        access_token: credAccessToken || undefined,
        client_id: credClientId || undefined,
        client_secret: credClientSecret || undefined,
        hmac_secret: credHmacSecret || undefined,
        partner_account_identifier: credPartnerId || undefined,
      });
      setCredAccessToken("");
      setCredClientSecret("");
      setCredHmacSecret("");
      toast({ title: "Ring platform credentials saved" });
      setCredDialogOpen(false);
      await loadAll();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not save credentials";
      toast({ title: "Failed", description: message, variant: "destructive" });
    } finally {
      setSavingCreds(false);
    }
  };

  const availableDevices = devices.filter((d) => d.owner_type === "platform" && d.status === "available");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-gray-600 text-sm">
          Onboard Ring check-in hardware into the shared pool and assign devices to events.
        </p>

        <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <KeyRound className="mr-2 h-4 w-4" />
              Platform Credentials
              {credStatus?.configured && (
                <Badge className="bg-green-100 text-green-800 border-green-200 ml-2">
                  <Check className="mr-1 h-3 w-3" /> Set
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Eventry's Shared Ring Credentials</DialogTitle>
              <DialogDescription>
                The default access token + Ring Developer app used for any device that isn't onboarded under its
                own account. Stored encrypted in the database — replaces the RING_ACCESS_TOKEN /
                RING_CLIENT_ID / RING_CLIENT_SECRET / RING_HMAC_SECRET env values. Leave a field blank to keep its
                current value.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <Label htmlFor="plat_access_token">
                  Access Token {credStatus?.access_token_set && <span className="text-xs text-green-600">(currently set)</span>}
                </Label>
                <Input
                  id="plat_access_token"
                  type="password"
                  value={credAccessToken}
                  onChange={(e) => setCredAccessToken(e.target.value)}
                  placeholder={credStatus?.access_token_set ? "•••••••• (leave blank to keep current)" : "Ring Playground / Partner API access token"}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="plat_client_id">Client ID</Label>
                  <Input id="plat_client_id" value={credClientId} onChange={(e) => setCredClientId(e.target.value)} placeholder="Ring Developer app client_id" />
                </div>
                <div>
                  <Label htmlFor="plat_partner_id">Partner Account Identifier</Label>
                  <Input id="plat_partner_id" value={credPartnerId} onChange={(e) => setCredPartnerId(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="plat_client_secret">
                    Client Secret {credStatus?.client_secret_set && <span className="text-xs text-green-600">(set)</span>}
                  </Label>
                  <Input
                    id="plat_client_secret"
                    type="password"
                    value={credClientSecret}
                    onChange={(e) => setCredClientSecret(e.target.value)}
                    placeholder={credStatus?.client_secret_set ? "•••••••• (leave blank to keep current)" : "Ring Developer app client_secret"}
                  />
                </div>
                <div>
                  <Label htmlFor="plat_hmac_secret">
                    HMAC Secret {credStatus?.hmac_secret_set && <span className="text-xs text-green-600">(set)</span>}
                  </Label>
                  <Input
                    id="plat_hmac_secret"
                    type="password"
                    value={credHmacSecret}
                    onChange={(e) => setCredHmacSecret(e.target.value)}
                    placeholder={credStatus?.hmac_secret_set ? "•••••••• (leave blank to keep current)" : "Webhook signing secret"}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSavePlatformCredentials} disabled={savingCreds}>
                {savingCreds ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboard a Device</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label htmlFor="new_device_id">Ring Device ID</Label>
              <Input id="new_device_id" value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} placeholder="ava1.ring.device...." />
            </div>
            <div>
              <Label htmlFor="new_name">Name</Label>
              <Input id="new_name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Front desk counter" />
            </div>
            <div>
              <Label htmlFor="new_location">Location</Label>
              <Input id="new_location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Lobby, Building A" />
            </div>
            <Button onClick={handleCreate} disabled={!newDeviceId || !newName || creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Onboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Device Requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{req.requested_by?.company || req.requested_by?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">
                    {[req.location, req.note].filter(Boolean).join(" — ") || "No details provided"}
                    {req.event?.title ? ` · for event: ${req.event.title}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={fulfillChoice[req.id] || ""}
                    onChange={(e) => setFulfillChoice((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  >
                    <option value="">Choose available device…</option>
                    {availableDevices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.device_id.slice(0, 16)}…)</option>
                    ))}
                  </select>
                  <Button size="sm" disabled={busyRequestId === req.id} onClick={() => handleFulfill(req)}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Fulfill
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyRequestId === req.id} onClick={() => handleReject(req)}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Devices ({devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : devices.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm">No devices onboarded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assign to Event</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[180px] truncate" title={d.device_id}>{d.device_id}</TableCell>
                    <TableCell>{d.location || "—"}</TableCell>
                    <TableCell>
                      {d.owner_type === "corporate" ? (
                        <span className="text-sm">{d.owner?.company || d.owner?.name || "Owner-linked"}</span>
                      ) : (
                        <Badge variant="outline">Platform pool</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.status === "assigned" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Assigned{d.assigned_event?.title ? `: ${d.assigned_event.title}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <select
                          className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs"
                          value={d.assigned_event_id ?? ""}
                          disabled={busyId === d.id}
                          onChange={(e) => applyAssignment(d.id, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">— Unassigned —</option>
                          {eventOptions.map((ev) => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
                        {d.assigned_event_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === d.id}
                            onClick={() => applyAssignment(d.id, null)}
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" disabled={busyId === d.id} onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyId === d.id} onClick={() => handleDelete(d)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editDevice} onOpenChange={(open) => !open && setEditDevice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update the name/location for {editDevice?.device_id}. Device ID can't be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit_name">Name</Label>
              <Input id="edit_name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit_location">Location</Label>
              <Input id="edit_location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDevice(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!editName || savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── "My Devices" tab — self-service onboarding, device requests against the
//    pool, and admin's own Ring Developer app credentials. Formerly the
//    entire self-service page that lived under the old role:corporate route. ──
const MyDevicesTab = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<RingDevice[]>([]);
  const [requests, setRequests] = useState<RingDeviceRequest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [onboarding, setOnboarding] = useState(false);

  const [reqLocation, setReqLocation] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [reqEventId, setReqEventId] = useState("");
  const [requesting, setRequesting] = useState(false);

  const [credStatus, setCredStatus] = useState<RingOwnerCredentialStatus | null>(null);
  const [credClientId, setCredClientId] = useState("");
  const [credClientSecret, setCredClientSecret] = useState("");
  const [credHmacSecret, setCredHmacSecret] = useState("");
  const [credPartnerId, setCredPartnerId] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, r, ev, creds] = await Promise.all([
        fetchMyRingDevices(),
        fetchMyRingDeviceRequests(),
        fetchEvents(),
        fetchMyRingCredentials(),
      ]);
      setDevices(d);
      setRequests(r);
      setEvents(ev);
      setCredStatus(creds);
      setCredClientId(creds.client_id || "");
      setCredPartnerId(creds.partner_account_identifier || "");
    } catch {
      toast({ title: "Failed to load your Ring devices", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOnboard = async () => {
    if (!deviceId || !name) return;
    setOnboarding(true);
    try {
      await onboardMyRingDevice({ device_id: deviceId, name, location: location || undefined });
      setDeviceId("");
      setName("");
      setLocation("");
      toast({ title: "Device onboarded", description: "It's now linked to your account." });
      await loadAll();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not onboard device";
      toast({ title: "Failed", description: message, variant: "destructive" });
    } finally {
      setOnboarding(false);
    }
  };

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await requestRingDevice({
        location: reqLocation || undefined,
        note: reqNote || undefined,
        event_id: reqEventId ? Number(reqEventId) : undefined,
      });
      setReqLocation("");
      setReqNote("");
      setReqEventId("");
      toast({ title: "Request sent", description: "A device will be assigned from the shared pool." });
      await loadAll();
    } catch {
      toast({ title: "Failed to send request", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credClientId) return;
    if (!credStatus?.configured && (!credClientSecret || !credHmacSecret)) return;
    setSavingCreds(true);
    try {
      await saveMyRingCredentials({
        client_id: credClientId,
        client_secret: credClientSecret,
        hmac_secret: credHmacSecret,
        partner_account_identifier: credPartnerId || undefined,
      });
      setCredClientSecret("");
      setCredHmacSecret("");
      toast({ title: "Ring app credentials saved" });
      await loadAll();
    } catch {
      toast({ title: "Failed to save credentials", variant: "destructive" });
    } finally {
      setSavingCreds(false);
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 text-sm">
        Onboard your own Ring hardware, or request one from the shared pool.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gray-500" /> Your Ring Developer App
            {credStatus?.configured && (
              <Badge className="bg-green-100 text-green-800 border-green-200 ml-1">
                <Check className="mr-1 h-3 w-3" /> Configured
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            If you have your own Ring Developer account, register these two URLs in your Ring console
            (Token Exchange URL and Account Link URL), then paste your app's credentials below. Your devices will
            then use your own Ring app instead of the shared one.
          </p>

          {credStatus && (
            <div className="space-y-2">
              {[
                { label: "Token Exchange URL", value: credStatus.token_exchange_url },
                { label: "Account Link URL", value: credStatus.account_link_url },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <Label className="w-40 shrink-0 text-xs text-gray-500">{item.label}</Label>
                  <Input readOnly value={item.value} className="text-xs font-mono" />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(item.value, item.label)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cred_client_id">Client ID</Label>
              <Input id="cred_client_id" value={credClientId} onChange={(e) => setCredClientId(e.target.value)} placeholder="Your Ring app's client_id" />
            </div>
            <div>
              <Label htmlFor="cred_partner_id">Partner Account Identifier (optional)</Label>
              <Input id="cred_partner_id" value={credPartnerId} onChange={(e) => setCredPartnerId(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cred_client_secret">Client Secret</Label>
              <Input
                id="cred_client_secret"
                type="password"
                value={credClientSecret}
                onChange={(e) => setCredClientSecret(e.target.value)}
                placeholder={credStatus?.configured ? "•••••••• (leave blank to keep current)" : "Your Ring app's client_secret"}
              />
            </div>
            <div>
              <Label htmlFor="cred_hmac_secret">HMAC Secret</Label>
              <Input
                id="cred_hmac_secret"
                type="password"
                value={credHmacSecret}
                onChange={(e) => setCredHmacSecret(e.target.value)}
                placeholder={credStatus?.configured ? "•••••••• (leave blank to keep current)" : "Your Ring app's webhook signing secret"}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveCredentials}
            disabled={!credClientId || savingCreds || (!credStatus?.configured && (!credClientSecret || !credHmacSecret))}
          >
            {savingCreds ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Save Credentials
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboard Your Own Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="own_device_id">Ring Device ID</Label>
              <Input id="own_device_id" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="ava1.ring.device...." />
            </div>
            <div>
              <Label htmlFor="own_name">Name</Label>
              <Input id="own_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Front desk counter" />
            </div>
            <div>
              <Label htmlFor="own_location">Location</Label>
              <Input id="own_location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lobby, HQ" />
            </div>
            <Button onClick={handleOnboard} disabled={!deviceId || !name || onboarding} className="w-full">
              {onboarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Onboard Device
            </Button>
            <p className="text-xs text-gray-500">
              Your device uses your own linked Ring account — link it first via your Ring app's account linking flow if you haven't already.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request a Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="req_location">Location</Label>
              <Input id="req_location" value={reqLocation} onChange={(e) => setReqLocation(e.target.value)} placeholder="Where will it be set up?" />
            </div>
            <div>
              <Label htmlFor="req_event">Event (optional)</Label>
              <select
                id="req_event"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reqEventId}
                onChange={(e) => setReqEventId(e.target.value)}
              >
                <option value="">— No specific event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="req_note">Note</Label>
              <Textarea id="req_note" value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Any details for the platform team" rows={3} />
            </div>
            <Button onClick={handleRequest} disabled={requesting} className="w-full" variant="outline">
              {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Request
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Devices ({devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : devices.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">No devices onboarded yet.</p>
          ) : (
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.location || "No location set"} · {d.device_id.slice(0, 20)}…</p>
                  </div>
                  {d.status === "assigned" ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Assigned{d.assigned_event?.title ? `: ${d.assigned_event.title}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Available</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm">{[r.location, r.note].filter(Boolean).join(" — ") || "No details"}</p>
                    {r.device && <p className="text-xs text-gray-500">Fulfilled with: {r.device.name}</p>}
                  </div>
                  <Badge
                    className={
                      r.status === "fulfilled"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : r.status === "rejected"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AdminRingDevices = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="h-6 w-6 text-gray-500" /> Ring Devices
          </h1>
          <p className="text-gray-600 text-sm mt-0.5">
            Manage the shared device pool and assignment queue, or onboard/request a device of your own.
          </p>
        </div>

        <Tabs defaultValue="pool" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pool">Device Pool</TabsTrigger>
            <TabsTrigger value="mine">My Devices</TabsTrigger>
          </TabsList>
          <TabsContent value="pool">
            <DevicePoolTab />
          </TabsContent>
          <TabsContent value="mine">
            <MyDevicesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminRingDevices;
