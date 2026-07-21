import { ImageResponse } from "next/og";

export const alt = "Nomu — I build, learn, test, and break things";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#f5f3ee", color: "#090909", padding: "64px", fontFamily: "sans-serif" }}><div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "66%" }}><span style={{ fontSize: 26 }}>Nomu / notes and experiments</span><strong style={{ fontSize: 86, lineHeight: 0.95, letterSpacing: "-5px" }}>I build, learn, test, and break things.</strong></div><div style={{ display: "flex", position: "absolute", width: 620, height: 620, right: -250, top: -60, borderRadius: "50%", background: "#090909" }}><div style={{ position: "absolute", width: 48, height: 160, borderRadius: 30, background: "#f5f3ee", left: 180, top: 125, transform: "rotate(-12deg)" }} /><div style={{ position: "absolute", width: 340, height: 150, borderRadius: "60% 20% 50% 50%", background: "#f5f3ee", left: 85, top: 390 }} /></div></div>, size);
}
