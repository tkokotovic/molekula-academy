export default function AdminHomeworksPage() {
  return <ComingSoon title="Domaće zadaće" desc="Kreiranje zadaća iz baze pitanja, dodjela grupama ili pojedincima, praćenje predaje i ispravljanje kratkih odgovora." />;
}

function ComingSoon({ title, desc }) {
  return (
    <div style={{ padding: '48px 32px', maxWidth: 600 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>
        U izradi
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>{title}</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}
