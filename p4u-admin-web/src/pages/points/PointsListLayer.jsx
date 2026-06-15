import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listPointsSettlements } from "../../lib/api/adminApi";
import { ApiError } from "../../lib/api/client";
import { formatDateTime } from "../../lib/formatters";

const PointsListLayer = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listPointsSettlements({ limit: 500, offset: 0 });
      setRows(res.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inferTag = (item) => {
    const s = `${item.reason || ""} ${item.type || ""} ${item.settlementType || ""}`.toLowerCase();
    if (s.includes("welcome")) return "welcome";
    if (s.includes("customer") && s.includes("ref")) return "customer_referral";
    if (s.includes("vendor") && s.includes("ref")) return "vendor_referral";
    if (s.includes("post") && s.includes("like")) return "post_like";
    if (s.includes("post") && s.includes("share")) return "post_share";
    if (s.includes("story") && s.includes("like")) return "story_like";
    if (s.includes("redeem")) return "redeemed";
    return "order_reward";
  };

  const stats = useMemo(() => {
    const out = {
      totalIssued: 0,
      redeemed: 0,
      welcome: 0,
      customerReferral: 0,
      vendorReferral: 0,
      postLikes: 0,
      postShares: 0,
      storyLikes: 0,
    };
    rows.forEach((r) => {
      const amt = Number(r.amount || r.points || 0) || 0;
      const tag = inferTag(r);
      if (amt > 0) out.totalIssued += amt;
      if (tag === "redeemed") out.redeemed += Math.abs(amt);
      if (tag === "welcome") out.welcome += amt;
      if (tag === "customer_referral") out.customerReferral += amt;
      if (tag === "vendor_referral") out.vendorReferral += amt;
      if (tag === "post_like") out.postLikes += amt;
      if (tag === "post_share") out.postShares += amt;
      if (tag === "story_like") out.storyLikes += amt;
    });
    return out;
  }, [rows]);

  const recentTransactions = useMemo(
    () =>
      [...rows]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 8),
    [rows],
  );

  const formatPts = (n) => Number(n || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className='mb-24'>
        <h3 className='fw-bold mb-4'>Loyalty Points</h3>
        <p className='text-secondary-light mb-0'>Welcome, referral, social, and order reward points management</p>
      </div>

      {error && (
        <div className='alert alert-danger radius-12 mb-16' role='alert'>
          {error}
        </div>
      )}

      {loading ? (
        <p className='text-secondary-light'>Loading points dashboard...</p>
      ) : (
        <>
          <div className='row g-16 mb-24'>
            <StatCard title='Total Points Issued' value={formatPts(stats.totalIssued)} />
            <StatCard title='Points Redeemed' value={formatPts(stats.redeemed)} />
            <StatCard title='Welcome Points' value={formatPts(stats.welcome)} />
            <StatCard title='Customer Referral' value={formatPts(stats.customerReferral)} />
            <StatCard title='Vendor Referral' value={formatPts(stats.vendorReferral)} />
            <StatCard title='Post Likes' value={formatPts(stats.postLikes)} />
            <StatCard title='Post Shares' value={formatPts(stats.postShares)} />
            <StatCard title='Story Likes' value={formatPts(stats.storyLikes)} />
          </div>

          <section className='row g-16'>
            <div className='col-12 col-xl-4'>
              <div className='card radius-12 border-0 shadow-sm h-100'>
                <div className='card-body p-24'>
                  <h5 className='fw-bold mb-20'>Points Configuration</h5>
                  <div className='d-flex flex-column gap-16'>
                    <ConfigItem
                      title='Welcome Bonus'
                      value='200 pts'
                      subtitle='Given to new customers on registration'
                    />
                    <ConfigItem
                      title='Referral Reward'
                      value='200 pts'
                      subtitle='Credited to referrer when a new customer signs up with their code'
                    />
                    <ConfigItem
                      title='Order Reward Rate'
                      value='2%'
                      subtitle='Percentage of order value as points'
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='col-12 col-xl-8'>
              <div className='card radius-12 border-0 shadow-sm h-100'>
                <div className='card-body p-24'>
                  <h5 className='fw-bold mb-20'>Recent Transactions</h5>
                  {recentTransactions.length === 0 ? (
                    <p className='text-secondary-light mb-0'>No recent points transactions.</p>
                  ) : (
                    <div className='d-flex flex-column gap-18'>
                      {recentTransactions.map((item) => {
                        const name = item.customerName || item.userName || item.name || "Customer";
                        const amount = Number(item.amount || item.points || 0) || 0;
                        const tag = inferTag(item).replace(/_/g, " ");
                        return (
                          <div key={item.id} className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                            <div className='d-flex align-items-center gap-10 min-w-0'>
                              <span className='px-10 py-4 rounded-pill bg-info-50 text-info-600 text-xs fw-semibold'>{tag}</span>
                              <div>
                                <h6 className='mb-2 fw-semibold'>{name}</h6>
                                <p className='text-secondary-light mb-0'>
                                  {item.description || item.reason || "Points transaction"}
                                </p>
                              </div>
                            </div>
                            <div className='text-end ms-auto'>
                              <h5 className={`mb-0 fw-bold ${amount >= 0 ? "text-success-600" : "text-danger-600"}`}>
                                {amount >= 0 ? "+" : ""}{formatPts(amount)}
                              </h5>
                              <span className='text-secondary-light text-sm'>{formatDateTime(item.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className='col-sm-6 col-xl-3'>
    <div className='card border-0 shadow-sm radius-12 h-100'>
      <div className='card-body p-16'>
        <p className='text-secondary-light mb-6'>{title}</p>
        <h4 className='fw-bold mb-0'>{value}</h4>
        <p className='mb-0 text-success-600 text-sm mt-8'>+0% <span className='text-secondary-light'>vs last month</span></p>
      </div>
    </div>
  </div>
);

const ConfigItem = ({ title, value, subtitle }) => (
  <div className='bg-primary-25 radius-12 p-14'>
    <p className='text-secondary-light mb-4'>{title}</p>
    <h3 className='fw-bold mb-2'>{value}</h3>
    <p className='text-secondary-light mb-0'>{subtitle}</p>
  </div>
);

export default PointsListLayer;
