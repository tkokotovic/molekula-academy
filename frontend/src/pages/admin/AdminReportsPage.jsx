export default function AdminReportsPage() {
  return <ComingSoon title="Izvještaji" desc="Generiranje roditeljskih izvještaja u PDF-u, sažeci napretka studenata, rezultati mock ispita i preporuke za daljnji rad." />;
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
