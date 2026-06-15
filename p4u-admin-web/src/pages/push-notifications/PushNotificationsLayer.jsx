import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { toast } from "react-toastify";
import { listRecentPushNotifications, sendPushNotification } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";

const AUDIENCE_OPTIONS = [
  { value: "all_users", label: "All Users" },
  { value: "vendors", label: "Vendors" },
  { value: "customers", label: "Customers" },
];

function audienceLabel(v) {
  const o = AUDIENCE_OPTIONS.find((x) => x.value === v);
  return o ? o.label : v || "—";
}

const PushNotificationsLayer = () => {
  const [targetAudience, setTargetAudience] = useState("all_users");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    setError("");
    try {
      const res = await listRecentPushNotifications({ limit: 30, offset: 0 });
      setRecent(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleSend = async (e) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t) {
      toast.error("Title is required.");
      return;
    }
    if (!b) {
      toast.error("Body is required.");
      return;
    }
    setSending(true);
    try {
      await sendPushNotification({
        targetAudience,
        title: t,
        body: b,
        deepLink: deepLink.trim() || null,
      });
      toast.success("Notification saved. (Connect FCM/APNs to deliver to devices.)");
      setTitle("");
      setBody("");
      setDeepLink("");
      await loadRecent();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className='row g-20'>
      <div className='col-lg-6'>
        <div className='card h-100 p-0 radius-16 border-0 shadow-sm'>
          <div className='card-body p-24'>
            <h4 className='fw-bold mb-16'>Send Notification</h4>
            <form onSubmit={handleSend} className='d-flex flex-column gap-16'>
              <div>
                <label className='form-label fw-semibold text-sm'>Target Audience</label>
                <div className='input-group radius-10'>
                  <span className='input-group-text bg-base border-end-0 text-secondary-light'>
                    <Icon icon='mdi:earth' className='text-xl' />
                  </span>
                  <select
                    className='form-select border-start-0 radius-10'
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                  >
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className='form-label fw-semibold text-sm'>Title</label>
                <input
                  className='form-control radius-10'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Notification title'
                  maxLength={255}
                />
              </div>
              <div>
                <label className='form-label fw-semibold text-sm'>Body</label>
                <textarea
                  className='form-control radius-10'
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='Notification message'
                />
              </div>
              <div>
                <label className='form-label fw-semibold text-sm'>Deep Link (optional)</label>
                <input
                  className='form-control radius-10'
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  placeholder='/app/orders or /app/product/123'
                  maxLength={512}
                />
              </div>
              <button type='submit' className='btn btn-primary radius-10 py-12 d-flex align-items-center justify-content-center gap-8' disabled={sending}>
                <Icon icon='mdi:send' className='text-xl' />
                {sending ? "Sending…" : "Send Notification"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className='col-lg-6'>
        <div className='card h-100 p-0 radius-16 border-0 shadow-sm'>
          <div className='card-body p-24'>
            <h4 className='fw-bold mb-16'>Recent Sends</h4>
            {error && <div className='alert alert-danger radius-12 mb-12 py-8 text-sm'>{error}</div>}
            {loadingRecent ? (
              <p className='text-secondary-light mb-0'>Loading…</p>
            ) : recent.length === 0 ? (
              <p className='text-secondary-light mb-0'>No notifications sent this session.</p>
            ) : (
              <ul className='list-unstyled d-flex flex-column gap-12 mb-0' style={{ maxHeight: "min(70vh, 520px)", overflowY: "auto" }}>
                {recent.map((n) => (
                  <li key={n.id} className='border radius-12 p-14 bg-neutral-50'>
                    <div className='fw-semibold text-primary-light'>{n.title}</div>
                    <div className='text-sm text-secondary-light mt-4 line-clamp-2'>{n.body}</div>
                    <div className='text-xs text-neutral-500 mt-8 d-flex flex-wrap gap-8 align-items-center'>
                      <span>{audienceLabel(n.targetAudience)}</span>
                      <span>·</span>
                      <span>{formatDateTime(n.createdAt)}</span>
                      {n.deepLink ? (
                        <>
                          <span>·</span>
                          <span className='text-truncate' style={{ maxWidth: 200 }} title={n.deepLink}>{n.deepLink}</span>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationsLayer;
