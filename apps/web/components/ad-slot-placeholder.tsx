type Placement = "after-tool";

/** Reserved Google AdSense region. Space is committed; scripts load only when a publisher id is configured. */
export function AdSlotPlaceholder({ placement, enabled = true }: { placement: Placement; enabled?: boolean }) {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || "";
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_AFTER_TOOL?.trim() || "";
  const live = enabled && Boolean(publisherId && slotId);

  return (
    <aside
      className={`ad-slot-placeholder container${enabled ? " reserved" : ""}`}
      data-placement={placement}
      data-ads-enabled={String(enabled)}
      data-ads-provider="google"
      aria-label={enabled ? "Advertisement" : undefined}
      aria-hidden={enabled ? undefined : true}
    >
      {enabled && !live && (
        <div className="ad-slot-label">
          <span>Advertisement</span>
          <small>Google AdSense space reserved</small>
        </div>
      )}
      {live && (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: 90 }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </aside>
  );
}
