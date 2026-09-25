type Placement = "after-tool";

/** Google AdSense region. Only mounts when publisher + slot IDs are configured. */
export function AdSlotPlaceholder({ placement, enabled = true }: { placement: Placement; enabled?: boolean }) {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || "";
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_AFTER_TOOL?.trim() || "";
  const live = enabled && Boolean(publisherId && slotId);
  if (!live) return null;

  return (
    <aside
      className="ad-slot-placeholder container reserved"
      data-placement={placement}
      data-ads-enabled="true"
      data-ads-provider="google"
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
