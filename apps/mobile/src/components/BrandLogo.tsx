import { useEffect, useState, type ReactNode } from "react";
import { Image, View } from "react-native";
import { SvgUri } from "react-native-svg";

/**
 * A server branding logo. Brand assets may be bitmaps or SVG and the URL does
 * not say which, so a bitmap load that fails is retried as SVG; when both fail
 * the built-in `fallback` shows instead.
 */
export const BrandLogo = ({ fallback, size, uri }: { fallback: ReactNode; size: number; uri: string }) => {
  const [mode, setMode] = useState<"bitmap" | "svg" | "failed">("bitmap");

  useEffect(() => {
    setMode("bitmap");
  }, [uri]);

  if (!uri || mode === "failed") {
    return <>{fallback}</>;
  }
  if (mode === "svg") {
    return (
      <View accessibilityIgnoresInvertColors style={{ height: size, width: size }}>
        <SvgUri height={size} onError={() => setMode("failed")} uri={uri} width={size} />
      </View>
    );
  }
  return (
    <Image
      accessibilityIgnoresInvertColors
      onError={() => setMode("svg")}
      resizeMode="contain"
      source={{ uri }}
      style={{ height: size, width: size }}
    />
  );
};
