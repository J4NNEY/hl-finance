"use client";

import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatIDR } from "./currency";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import type { Transaction, TransactionLine, Customer } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottomWidth: 2, borderBottomColor: "#4338ca", paddingBottom: 16 },
  headerLeft: {},
  title: { fontSize: 22, fontWeight: "bold", color: "#4338ca" },
  subtitle: { fontSize: 10, color: "#78716c", marginTop: 2 },
  badge: { fontSize: 10, fontWeight: "bold", color: "#fff", backgroundColor: "#4338ca", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  badgeLunas: { backgroundColor: "#059669" },
  badgePiutang: { backgroundColor: "#dc2626" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, backgroundColor: "#f5f5f4", padding: 12, borderRadius: 4 },
  infoItem: { width: "50%", marginBottom: 8 },
  infoLabel: { fontSize: 8, color: "#78716c", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: "row", backgroundColor: "#4338ca", paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderText: { fontSize: 8, fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4" },
  tableRowEven: { backgroundColor: "#f5f5f4" },
  tableCell: { fontSize: 9 },
  textRight: { textAlign: "right" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  summaryCard: { width: "48%", backgroundColor: "#f5f5f4", padding: 10, borderRadius: 4 },
  summaryCardHighlight: { backgroundColor: "#4338ca" },
  summaryLabel: { fontSize: 8, color: "#78716c", textTransform: "uppercase" },
  summaryLabelLight: { color: "#bfdbfe" },
  summaryValue: { fontSize: 14, fontWeight: "bold", marginTop: 2 },
  summaryValueLight: { color: "#fff" },
  profitValue: { color: "#059669" },
  typeGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeCard: { flex: 1, backgroundColor: "#f5f5f4", padding: 10, borderRadius: 4 },
  typeCardLM: { borderLeftWidth: 3, borderLeftColor: "#4338ca" },
  typeCardBR: { borderLeftWidth: 3, borderLeftColor: "#7c3aed" },
  typeLabel: { fontSize: 8, color: "#78716c" },
  typeValue: { fontSize: 14, fontWeight: "bold", marginTop: 2 },
  typePercent: { fontSize: 9, color: "#78716c", marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  statCard: { width: "48%", backgroundColor: "#f5f5f4", padding: 10, borderRadius: 4, borderTopWidth: 2, borderTopColor: "#4338ca" },
  statCardPiutang: { borderTopColor: "#dc2626" },
  statCardLunas: { borderTopColor: "#059669" },
  statLabel: { fontSize: 8, color: "#78716c" },
  statValue: { fontSize: 14, fontWeight: "bold", marginTop: 2 },
  statValueRed: { color: "#dc2626" },
  statValueGreen: { color: "#059669" },
  footer: { marginTop: 30, textAlign: "center", color: "#a8a29e", fontSize: 8, borderTopWidth: 0.5, borderTopColor: "#e7e5e4", paddingTop: 12 },
  emptyText: { color: "#a8a29e", textAlign: "center", marginTop: 30 },
});

function formatMoney(amount: number): string {
  return formatIDR(amount);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "dd MMM yyyy", { locale: localeID });
}

function formatDateLong(dateStr: string): string {
  return format(new Date(dateStr), "dd MMMM yyyy", { locale: localeID });
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ TRANSACTION BON PDF ============

interface TransactionPDFData {
  transaction: Transaction;
  lines: (TransactionLine & { product?: { nama: string; tipe: string } })[];
  customer: Customer;
}

export async function generateTransactionPDF(data: TransactionPDFData) {
  const { transaction, lines, customer } = data;
  const totalOmzet = lines.reduce((sum, l) => sum + (l.line_omzet || 0), 0);
  const totalLaba = lines.reduce((sum, l) => sum + (l.line_laba || 0), 0);
  const totalTagihan = totalOmzet + (transaction.ongkir || 0);
  const isLunas = transaction.status === "Lunas";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Bon Penjualan</Text>
            <Text style={styles.subtitle}>HL Finance</Text>
          </View>
          <Text style={[styles.badge, isLunas ? styles.badgeLunas : styles.badgePiutang]}>
            {transaction.status}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nomor Bon</Text>
            <Text style={styles.infoValue}>{transaction.nomor_bon}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tanggal</Text>
            <Text style={styles.infoValue}>{formatDateLong(transaction.tanggal)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pelanggan</Text>
            <Text style={styles.infoValue}>{customer?.nama || "-"}</Text>
          </View>
          {transaction.tanggal_lunas && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tanggal Lunas</Text>
              <Text style={styles.infoValue}>{formatDateLong(transaction.tanggal_lunas)}</Text>
            </View>
          )}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "25%" }]}>Produk</Text>
            <Text style={[styles.tableHeaderText, { width: "10%" }]}>Tipe</Text>
            <Text style={[styles.tableHeaderText, { width: "20%", textAlign: "right" }]}>Harga Satuan</Text>
            <Text style={[styles.tableHeaderText, { width: "10%", textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { width: "17%", textAlign: "right" }]}>Omzet</Text>
            <Text style={[styles.tableHeaderText, { width: "18%", textAlign: "right" }]}>Laba</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : {}]}>
              <Text style={[styles.tableCell, { width: "25%" }]}>{l.product?.nama || "-"}</Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>{l.product?.tipe || "-"}</Text>
              <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>{formatMoney(l.discounted_unit_price)}</Text>
              <Text style={[styles.tableCell, { width: "10%", textAlign: "right" }]}>{l.quantity}</Text>
              <Text style={[styles.tableCell, { width: "17%", textAlign: "right" }]}>{formatMoney(l.line_omzet)}</Text>
              <Text style={[styles.tableCell, { width: "18%", textAlign: "right" }]}>{formatMoney(l.line_laba)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Omzet</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalOmzet)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Ongkir</Text>
            <Text style={styles.summaryValue}>{formatMoney(transaction.ongkir || 0)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
            <Text style={[styles.summaryLabel, styles.summaryLabelLight]}>Total Tagihan</Text>
            <Text style={[styles.summaryValue, styles.summaryValueLight]}>{formatMoney(totalTagihan)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Laba</Text>
            <Text style={[styles.summaryValue, styles.profitValue]}>{formatMoney(totalLaba)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Dicetak pada {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeID })}</Text>
          <Text>HL Finance - Sales & Receivables Management</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `Bon_${transaction.nomor_bon}.pdf`);
}

// ============ CUSTOMER REPORT PDF ============

interface CustomerReportData {
  customer: Customer;
  transactions: (Transaction & { transaction_lines?: (TransactionLine & { product?: { tipe: string } })[] })[];
  month: number;
  year: number;
}

export async function generateCustomerReportPDF(data: CustomerReportData) {
  const { customer, transactions, month, year } = data;
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  let totalPiutang = 0, totalSudahDibayar = 0, totalOmzetLunas = 0, totalLabaLunas = 0, omzetLM = 0, omzetBR = 0;

  transactions.forEach((t) => {
    if (t.is_bonus) return;
    const lineOmzet = t.transaction_lines?.reduce((sum, l) => sum + l.line_omzet, 0) || 0;
    const lineLaba = t.transaction_lines?.reduce((sum, l) => sum + l.line_laba, 0) || 0;
    const total = lineOmzet + (t.ongkir || 0);
    if (t.status === "Lunas") {
      totalSudahDibayar += total;
      totalOmzetLunas += lineOmzet;
      totalLabaLunas += lineLaba;
      t.transaction_lines?.forEach((l) => {
        if (l.product?.tipe === "LM") omzetLM += l.line_omzet;
        else if (l.product?.tipe === "BR") omzetBR += l.line_omzet;
      });
    } else {
      totalPiutang += total;
    }
  });

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Laporan Transaksi Pelanggan</Text>
            <Text style={styles.subtitle}>{customer.nama} - {monthNames[month - 1]} {year}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPiutang]}>
            <Text style={styles.statLabel}>Total Piutang</Text>
            <Text style={[styles.statValue, styles.statValueRed]}>{formatMoney(totalPiutang)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLunas]}>
            <Text style={styles.statLabel}>Sudah Dibayar</Text>
            <Text style={[styles.statValue, styles.statValueGreen]}>{formatMoney(totalSudahDibayar)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Omzet Lunas</Text>
            <Text style={styles.statValue}>{formatMoney(totalOmzetLunas)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLunas]}>
            <Text style={styles.statLabel}>Laba HL</Text>
            <Text style={[styles.statValue, styles.statValueGreen]}>{formatMoney(totalLabaLunas)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Breakdown Omzet per Tipe</Text>
        <View style={styles.typeGrid}>
          <View style={[styles.typeCard, styles.typeCardLM]}>
            <Text style={styles.typeLabel}>LM (Lemari)</Text>
            <Text style={styles.typeValue}>{formatMoney(omzetLM)}</Text>
          </View>
          <View style={[styles.typeCard, styles.typeCardBR]}>
            <Text style={styles.typeLabel}>BR (Bukan Lemari)</Text>
            <Text style={styles.typeValue}>{formatMoney(omzetBR)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Daftar Transaksi</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>Tanggal</Text>
            <Text style={[styles.tableHeaderText, { width: "15%" }]}>No. Bon</Text>
            <Text style={[styles.tableHeaderText, { width: "12%" }]}>Status</Text>
            <Text style={[styles.tableHeaderText, { width: "13%" }]}>Tipe</Text>
            <Text style={[styles.tableHeaderText, { width: "15%", textAlign: "right" }]}>Omzet</Text>
            <Text style={[styles.tableHeaderText, { width: "15%", textAlign: "right" }]}>Ongkir</Text>
            <Text style={[styles.tableHeaderText, { width: "15%", textAlign: "right" }]}>Total</Text>
          </View>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada transaksi di bulan ini</Text>
          ) : transactions.map((t, i) => {
            const lineOmzet = t.transaction_lines?.reduce((sum, l) => sum + l.line_omzet, 0) || 0;
            const total = lineOmzet + (t.ongkir || 0);
            const types = [...new Set(t.transaction_lines?.map((l) => l.product?.tipe).filter(Boolean))];
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : {}]}>
                <Text style={[styles.tableCell, { width: "15%" }]}>{formatDate(t.tanggal)}</Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>{t.nomor_bon}</Text>
                <Text style={[styles.tableCell, { width: "12%" }]}>{t.status}</Text>
                <Text style={[styles.tableCell, { width: "13%" }]}>{t.is_bonus ? "Bonus" : types.join(", ")}</Text>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{formatMoney(lineOmzet)}</Text>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{formatMoney(t.ongkir || 0)}</Text>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "right", fontWeight: "bold" }]}>{formatMoney(total)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>Dicetak pada {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeID })}</Text>
          <Text>HL Finance - Sales & Receivables Management</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `Laporan_${customer.nama}_${monthNames[month - 1]}_${year}.pdf`);
}

// ============ RECAP REPORT PDF ============

interface RecapReportData {
  title: string;
  subtitle: string;
  reportData: {
    total_omzet_lunas: number;
    total_laba_lunas: number;
    total_piutang: number;
    total_sudah_dibayar: number;
    omzet_lm: number;
    omzet_br: number;
  };
  transactions?: (Transaction & { customer?: Customer; transaction_lines?: (TransactionLine & { product?: { tipe: string } })[] })[];
}

export async function generateRecapPDF(data: RecapReportData) {
  const { title, subtitle, reportData, transactions } = data;
  const omzetPercent = reportData.total_omzet_lunas > 0 ? ((reportData.omzet_lm / reportData.total_omzet_lunas) * 100).toFixed(1) : "0";
  const brPercent = reportData.total_omzet_lunas > 0 ? ((reportData.omzet_br / reportData.total_omzet_lunas) * 100).toFixed(1) : "0";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Omzet Lunas</Text>
            <Text style={styles.statValue}>{formatMoney(reportData.total_omzet_lunas)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLunas]}>
            <Text style={styles.statLabel}>Laba HL</Text>
            <Text style={[styles.statValue, styles.statValueGreen]}>{formatMoney(reportData.total_laba_lunas)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardPiutang]}>
            <Text style={styles.statLabel}>Piutang</Text>
            <Text style={[styles.statValue, styles.statValueRed]}>{formatMoney(reportData.total_piutang)}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardLunas]}>
            <Text style={styles.statLabel}>Sudah Dibayar</Text>
            <Text style={[styles.statValue, styles.statValueGreen]}>{formatMoney(reportData.total_sudah_dibayar)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Breakdown per Tipe Produk</Text>
        <View style={styles.typeGrid}>
          <View style={[styles.typeCard, styles.typeCardLM]}>
            <Text style={styles.typeLabel}>LM (Lemari)</Text>
            <Text style={styles.typeValue}>{formatMoney(reportData.omzet_lm)}</Text>
            <Text style={styles.typePercent}>{omzetPercent}% dari total omzet</Text>
          </View>
          <View style={[styles.typeCard, styles.typeCardBR]}>
            <Text style={styles.typeLabel}>BR (Bukan Lemari)</Text>
            <Text style={styles.typeValue}>{formatMoney(reportData.omzet_br)}</Text>
            <Text style={styles.typePercent}>{brPercent}% dari total omzet</Text>
          </View>
        </View>

        {transactions && transactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Detail Transaksi</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: "13%" }]}>Tanggal</Text>
                <Text style={[styles.tableHeaderText, { width: "13%" }]}>No. Bon</Text>
                <Text style={[styles.tableHeaderText, { width: "18%" }]}>Pelanggan</Text>
                <Text style={[styles.tableHeaderText, { width: "10%" }]}>Status</Text>
                <Text style={[styles.tableHeaderText, { width: "11%" }]}>Tipe</Text>
                <Text style={[styles.tableHeaderText, { width: "12%", textAlign: "right" }]}>Omzet</Text>
                <Text style={[styles.tableHeaderText, { width: "10%", textAlign: "right" }]}>Ongkir</Text>
                <Text style={[styles.tableHeaderText, { width: "13%", textAlign: "right" }]}>Total</Text>
              </View>
              {transactions.filter(t => !t.is_bonus).map((t, i) => {
                const lineOmzet = t.transaction_lines?.reduce((sum, l) => sum + l.line_omzet, 0) || 0;
                const total = lineOmzet + (t.ongkir || 0);
                const types = [...new Set(t.transaction_lines?.map((l) => l.product?.tipe).filter(Boolean))];
                return (
                  <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCell, { width: "13%" }]}>{formatDate(t.tanggal)}</Text>
                    <Text style={[styles.tableCell, { width: "13%" }]}>{t.nomor_bon}</Text>
                    <Text style={[styles.tableCell, { width: "18%" }]}>{t.customer?.nama || "-"}</Text>
                    <Text style={[styles.tableCell, { width: "10%" }]}>{t.status}</Text>
                    <Text style={[styles.tableCell, { width: "11%" }]}>{types.join(", ")}</Text>
                    <Text style={[styles.tableCell, { width: "12%", textAlign: "right" }]}>{formatMoney(lineOmzet)}</Text>
                    <Text style={[styles.tableCell, { width: "10%", textAlign: "right" }]}>{formatMoney(t.ongkir || 0)}</Text>
                    <Text style={[styles.tableCell, { width: "13%", textAlign: "right", fontWeight: "bold" }]}>{formatMoney(total)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text>Dicetak pada {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeID })}</Text>
          <Text>HL Finance - Sales & Receivables Management</Text>
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${title.replace(/\s+/g, "_")}.pdf`);
}
