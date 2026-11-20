import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { BriefFields, BriefVersion } from "../domain/brief";

const FIELD_ORDER: Array<{ key: keyof BriefFields; label: string }> = [
  { key: "objective", label: "Objective" },
  { key: "audience", label: "Audience" },
  { key: "pages", label: "Pages" },
  { key: "features", label: "Features" },
  { key: "deliverables", label: "Deliverables" },
];

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#33333d" },
  header: { marginBottom: 24, paddingBottom: 16, borderBottom: "2pt solid #14141a" },
  wordmark: { fontSize: 18, fontWeight: 700, color: "#14141a", letterSpacing: 1 },
  tagline: { fontSize: 9, color: "#8a8a93", marginTop: 2 },
  title: { fontSize: 20, fontWeight: 700, color: "#14141a", marginBottom: 4 },
  meta: { fontSize: 9, color: "#8a8a93", marginBottom: 24 },
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: 700, color: "#14141a", marginBottom: 4 },
  fieldValue: { fontSize: 11, lineHeight: 1.5, color: "#33333d" },
});

function BriefPdfDocument({ projectName, brief }: { projectName: string; brief: BriefVersion }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>ROYAL CREATIVE</Text>
          <Text style={styles.tagline}>Your project, in one place.</Text>
        </View>
        <Text style={styles.title}>{projectName} — Website brief</Text>
        <Text style={styles.meta}>Version {brief.versionNumber} · {brief.status}</Text>
        {FIELD_ORDER.map(({ key, label }) => (
          <View key={key} style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{brief.fields[key] || "—"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderBriefPdf(projectName: string, brief: BriefVersion): Promise<Buffer> {
  return renderToBuffer(<BriefPdfDocument projectName={projectName} brief={brief} />);
}
