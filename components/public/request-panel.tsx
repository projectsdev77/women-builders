import { RequestInviteForm } from './request-invite-form';

/** The "Request an invitation" panel: sticky title on the left, form on the right (designer: white panel, radius 40). */
export function RequestPanel({ waitlist }: { waitlist: { nextReview: string | null } | null }) {
  return (
    <div className="relative grid items-start gap-[clamp(32px,5vw,64px)] overflow-hidden rounded-[40px] bg-white p-[clamp(24px,5vw,64px)] lg:grid-cols-2">
      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        <h2 id="request-heading" className="text-[clamp(40px,5vw,64px)] leading-none tracking-[-0.02em]">
          {waitlist ? 'Join the waitlist.' : 'Request an invitation.'}
        </h2>
        <p className="text-[17px] leading-relaxed text-ink-muted">
          {waitlist
            ? 'Tell us a little about you. Every request gets an answer after our next review.'
            : 'Tell us a little about you. Our team reads every request and answers within three weeks.'}
        </p>
        {waitlist && (
          <div role="note" className="rounded-2xl bg-warning-bg px-4 py-3.5 text-[15px] leading-normal text-warning-body">
            We review requests in rounds and are not reviewing right now. {waitlist.nextReview && <b>{waitlist.nextReview}.</b>}
          </div>
        )}
        <div aria-hidden className="h-[120px] rounded-3xl" style={{ background: 'repeating-linear-gradient(90deg,#C9D9A8 0 12px,#E6EED6 12px 24px)' }} />
        <p className="text-[14px] text-ink-subtle">No newsletter, no spam. One reply from a human, either way.</p>
      </div>
      <RequestInviteForm waitlist={waitlist} />
    </div>
  );
}
