"use client";

import { Button } from "@/components/brand";
import { Toaster, toast } from "@/components/toast";

/** Fires the toast states used during a run, so they can be reviewed without touching a chain. */
export function ToastDemo() {
  const flow = () => {
    const id = toast.loading({ title: "Sending the delegation", body: "One type-4 transaction carrying all 50 authorizations." });
    setTimeout(() => toast.success({ title: "Delegation confirmed", body: "Included in block 7,412,093.", link: { href: "#", label: "tx 0x3f1a…9c2e" } }, id), 1800);
  };
  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" onClick={flow}>Loading → success</Button>
        <Button variant="secondary" onClick={() => toast.warning({ title: "The wallet has been taken over", body: "Its code is now 0xef0100 + the sweeper’s address." })}>Warning</Button>
        <Button variant="secondary" onClick={() => toast.error({ title: "The run hit an error", body: "See the log for details." })}>Error</Button>
        <Button variant="secondary" onClick={() => toast.info({ title: "Attack started on Sepolia", body: "Follow the diagram. Each step is a real transaction." })}>Info</Button>
      </div>
      <p className="text-[13px] text-bn-muted mt-3">Example values for review only.</p>
      <Toaster />
    </>
  );
}
