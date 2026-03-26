import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import DeviceInfo from "react-native-device-info";
import { useTheme } from "../theme/useTheme";
import Button from "./common/Button";
import Card from "./common/Card";
import LoadingSpinner from "./common/LoadingSpinner";
import { QwenModelManager } from "../ai/models/QwenModelManager";
import {
  MAIN_MODEL_SIZE_BYTES,
  MMPROJ_SIZE_BYTES,
} from "../ai/models/QwenModelManager";
import { SLMModelManager, SLM_MODEL_SIZE_BYTES } from "../ai/models/SLMModelManager";

type SetupState = "idle" | "downloading" | "complete" | "error";

type Props = {
  onComplete: () => void;
  onSkip: () => void;
};

function clampPct(pct: number) {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.floor(pct)));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  if (bytes >= kb) return `${Math.round(bytes / kb)} KB`;
  return `${Math.round(bytes)} B`;
}

let MMKVImpl: any;
const getMMKV = () => {
  if (!MMKVImpl) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-mmkv");
    MMKVImpl = mod?.MMKV ?? mod?.default ?? mod;
  }
  return new MMKVImpl();
};

const WIFI_ONLY_KEY = "models_wifi_only";
const SKIPPED_KEY = "models_setup_skipped";

function ProgressBar({ pct }: { pct: number }) {
  const theme = useTheme();
  const safePct = clampPct(pct);
  const trackColor = theme.secondary;

  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${safePct}%`,
            backgroundColor: theme.primary,
          },
        ]}
      />
    </View>
  );
}

export default function ModelSetupScreen({ onComplete, onSkip }: Props) {
  const theme = useTheme();
  const mutedTextColor = theme.secondary;
  const [state, setState] = useState<SetupState>("idle");
  const [mainPct, setMainPct] = useState(0);
  const [mmprojPct, setMmprojPct] = useState(0);
  const [slmPct, setSlmPct] = useState(0);
  const [error, setError] = useState<string>("");
  const [totalMemoryBytes, setTotalMemoryBytes] = useState<number | null>(null);
  const [wifiOnly, setWifiOnly] = useState<boolean>(() => {
    try {
      const kv = getMMKV();
      return kv.getBoolean(WIFI_ONLY_KEY) === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    DeviceInfo.getTotalMemory()
      .then((bytes) => {
        if (!cancelled) setTotalMemoryBytes(bytes);
      })
      .catch(() => {
        if (!cancelled) setTotalMemoryBytes(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const limitedRamWarning = useMemo(() => {
    if (typeof totalMemoryBytes !== "number") return false;
    const fiveGb = 5 * 1024 * 1024 * 1024;
    return totalMemoryBytes > 0 && totalMemoryBytes < fiveGb;
  }, [totalMemoryBytes]);

  const startDownload = async () => {
    setError("");
    setState("downloading");
    setMainPct(0);
    setMmprojPct(0);
    setSlmPct(0);

    try {
      if (wifiOnly) {
        try {
          // Optional dependency
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Network = require("expo-network") as any;
          const state = await Network.getNetworkStateAsync();
          const type = String(state?.type ?? "").toLowerCase();
          const isWifi = type.includes("wifi");
          if (!isWifi) {
            throw new Error("WiFi-only is enabled. Please connect to WiFi to download models.");
          }
        } catch (e: any) {
          // If expo-network isn't installed, still enforce by showing a clear error.
          throw new Error(e?.message ? String(e.message) : "WiFi-only is enabled. Please connect to WiFi.");
        }
      }

      await QwenModelManager.downloadModels((m, v) => {
        setMainPct(clampPct(m));
        setMmprojPct(clampPct(v));
      });

      await SLMModelManager.downloadSLM((p) => {
        setSlmPct(clampPct(p));
      });

      setMainPct(100);
      setMmprojPct(100);
      setSlmPct(100);
      setState("complete");
      setTimeout(() => {
        onComplete();
      }, 300);
    } catch (e: any) {
      setState("error");
      setError(e?.message ? String(e.message) : "Download failed");
    }
  };

  const isComplete =
    state === "complete" ||
    (mainPct >= 100 && mmprojPct >= 100 && slmPct >= 100);

  const totalBytes = MAIN_MODEL_SIZE_BYTES + MMPROJ_SIZE_BYTES + SLM_MODEL_SIZE_BYTES;

  const deleteVisionModels = async () => {
    setError("");
    setState("idle");
    setMainPct(0);
    setMmprojPct(0);
    try {
      await QwenModelManager.deleteModels();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Delete failed");
      setState("error");
    }
  };

  const deleteSLMModel = async () => {
    setError("");
    setState("idle");
    setSlmPct(0);
    try {
      await SLMModelManager.deleteSLM();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Delete failed");
      setState("error");
    }
  };

  const handleSkip = () => {
    try {
      const kv = getMMKV();
      kv.set(SKIPPED_KEY, true);
    } catch {
      // ignore
    }
    onSkip();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: theme.text }]}>
          Download AI Models
        </Text>

        <Card>
          <Text style={[styles.bannerText, { color: theme.text }]}
          >
            Downloads are resumable. You can delete models later to free space.
          </Text>
        </Card>

        <Card>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>WiFi-only downloads</Text>
            <Switch
              value={wifiOnly}
              onValueChange={(v) => {
                setWifiOnly(v);
                try {
                  const kv = getMMKV();
                  kv.set(WIFI_ONLY_KEY, v);
                } catch {
                  // ignore
                }
              }}
            />
          </View>
        </Card>

        {limitedRamWarning ? (
          <Card>
            <View style={styles.warningRow}>
              <View
                style={[styles.warningDot, { backgroundColor: "#F4B400" }]}
              />
              <Text style={[styles.warningText, { color: theme.text }]}>
                Your device has limited RAM.{"\n"}
                Analysis may be slow or unavailable.
              </Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.sizeRow}>
          <Text style={[styles.sizeText, { color: mutedTextColor }]}
          >
            {formatBytes(totalBytes)} total
          </Text>
          {isComplete ? (
            <View style={styles.readyRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={[styles.readyText, { color: "#1B9A59" }]}
              >
                Ready!
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressCol}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>
              Vision Model ({formatBytes(MAIN_MODEL_SIZE_BYTES)})
            </Text>
            <ProgressBar pct={mainPct} />
            <Text style={[styles.progressPct, { color: mutedTextColor }]}>
              {clampPct(mainPct)}%
            </Text>
            <Button title="Delete" onPress={deleteVisionModels} variant="secondary" />
          </View>

          <View style={styles.progressCol}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>
              Vision Engine ({formatBytes(MMPROJ_SIZE_BYTES)})
            </Text>
            <ProgressBar pct={mmprojPct} />
            <Text style={[styles.progressPct, { color: mutedTextColor }]}>
              {clampPct(mmprojPct)}%
            </Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressCol}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>
              Health Advisor SLM ({formatBytes(SLM_MODEL_SIZE_BYTES)})
            </Text>
            <ProgressBar pct={slmPct} />
            <Text style={[styles.progressPct, { color: mutedTextColor }]}>
              {clampPct(slmPct)}%
            </Text>
            <Button title="Delete" onPress={deleteSLMModel} variant="secondary" />
          </View>
        </View>

        {state === "downloading" ? (
          <View style={styles.spinnerWrap}>
            <LoadingSpinner />
          </View>
        ) : null}

        {state === "error" ? (
          <Card>
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </Text>
            <Button title="Retry" onPress={startDownload} />
          </Card>
        ) : null}

        {state !== "downloading" && !isComplete ? (
          <Button title="Download Now" onPress={startDownload} />
        ) : null}

        {state !== "downloading" && !isComplete ? (
          <TouchableOpacity
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip model download"
            accessibilityHint="Skips downloading AI models and continues to the app"
          >
            <Text style={[styles.skipText, { color: mutedTextColor }]}
            >
              Skip for now
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sizeRow: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1B9A59",
  },
  readyText: {
    fontSize: 14,
    fontWeight: "800",
  },
  progressRow: {
    flexDirection: "row",
    gap: 12,
  },
  progressCol: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  skipText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  spinnerWrap: {
    height: 90,
  },
  warningRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  warningDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
});
