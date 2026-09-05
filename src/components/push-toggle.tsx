import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives";
import { useLanguage } from "@/lib/i18n";
import {
  getPushState,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { sendPushNotification } from "@/lib/push.functions";

type State = "on" | "off" | "unsupported" | "denied" | "busy";

export function PushToggle() {
  const { t } = useLanguage();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    getPushState()
      .then(setState)
      .catch(() => setState("off"));
  }, []);

  if (state === null || state === "unsupported") return null;

  const onClick = async () => {
    setState("busy");
    try {
      if (await isOn()) {
        await unsubscribeFromPush();
        setState("off");
        toast.success(t("push.off"));
      } else {
        await subscribeToPush();
        setState("on");
        toast.success(t("push.on"));
        // Fire a welcome notification so the user sees it working.
        sendPushNotification({
          data: {
            title: t("push.welcomeTitle"),
            body: t("push.welcomeBody"),
            url: "/",
          },
        }).catch(() => undefined);
      }
    } catch (err) {
      setState((await getPushState().catch(() => "off")) as State);
      toast.error(err instanceof Error ? err.message : t("push.error"));
    }
  };

  const isOn = async () => (await getPushState()) === "on";

  const Icon = state === "denied" ? BellOff : state === "on" ? BellRing : Bell;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={state === "busy" || state === "denied"}
      aria-label={t("push.toggle")}
      title={
        state === "denied"
          ? t("push.denied")
          : state === "on"
            ? t("push.on")
            : t("push.off")
      }
    >
      <Icon className={state === "on" ? "size-4 text-primary" : "size-4"} />
    </Button>
  );
}
