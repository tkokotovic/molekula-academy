// Privacy Policy — GDPR + Croatian law (Zakon o provedbi Opće uredbe o zaštiti podataka)

const LAST_UPDATED = '9. lipnja 2025.';
const LAST_UPDATED_EN = 'June 9, 2025';
const CONTROLLER_NAME = 'Tomislav Kokotović';
const CONTROLLER_ADDRESS = 'Zagreb, Hrvatska';
const CONTACT_EMAIL = 'tomislav@molekula-academy.hr';

function useT() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  return (hr, en) => lang === 'en' ? en : hr;
}

function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 8px',
      }}>
        Molekula Academy
      </p>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 34, color: 'var(--ink)', margin: '0 0 10px' }}>
        {title}
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0 }}>{subtitle}</p>
    </div>
  );
}

function SectionBlock({ heading, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: 'var(--display)', fontSize: 20, color: 'var(--ink)',
        margin: '0 0 12px', paddingBottom: 8,
        borderBottom: '1px solid var(--line)',
      }}>
        {heading}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function P({ children }) {
  return <p style={{ margin: 0 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function InfoBox({ children }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 10,
      background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
      fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

export default function PrivacyPage() {
  const t = useT();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>

      <PageHeader
        title={t('Politika privatnosti', 'Privacy Policy')}
        subtitle={t(
          `Zadnje ažuriranje: ${LAST_UPDATED}`,
          `Last updated: ${LAST_UPDATED_EN}`,
        )}
      />

      <InfoBox>
        {t(
          'Ova Politika privatnosti primjenjuje se na sve korisnike platforme Molekula Academy u skladu s Općom uredbom o zaštiti podataka (GDPR, Uredba EU 2016/679) i Zakonom o provedbi Opće uredbe o zaštiti podataka (NN 42/2018).',
          'This Privacy Policy applies to all users of the Molekula Academy platform in accordance with the General Data Protection Regulation (GDPR, EU Regulation 2016/679) and Croatian implementing legislation (Official Gazette 42/2018).',
        )}
      </InfoBox>

      {/* 1 */}
      <SectionBlock heading={t('1. Voditelj obrade podataka', '1. Data Controller')}>
        <P>
          {t(
            'Voditelj obrade osobnih podataka je:',
            'The data controller for your personal data is:',
          )}
        </P>
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'var(--bg)', border: '1px solid var(--line)',
          fontFamily: 'var(--mono)', fontSize: 13.5, lineHeight: 1.8,
        }}>
          <strong>{CONTROLLER_NAME}</strong><br />
          {CONTROLLER_ADDRESS}<br />
          {t('E-mail', 'Email')}: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>
        </div>
      </SectionBlock>

      {/* 2 */}
      <SectionBlock heading={t('2. Koji podaci se prikupljaju', '2. What Data We Collect')}>
        <P>{t('Prikupljamo sljedeće kategorije osobnih podataka:', 'We collect the following categories of personal data:')}</P>
        <UL items={t(
          [
            'Podaci za registraciju: ime i prezime, e-mail adresa, lozinka (pohranjena kao bcrypt hash)',
            'Podaci o plaćanju: plan pretplate (Basic / Premium) — broj kartice nikada ne pohranjujemo na vlastite poslužitelje',
            'Podaci o korištenju: napredak u lekcijama, rezultati kvizova, preuzeti certifikati',
            'Komunikacijski podaci: poruke razmijenjene između studenta i nastavnika unutar platforme',
            'Tehnički podaci: IP adresa, vrsta preglednika (prikuplja se isključivo u svrhu sigurnosti i dijagnostike)',
          ],
          [
            'Registration data: full name, email address, password (stored as a bcrypt hash)',
            'Payment data: subscription plan (Basic / Premium) — we never store card numbers on our own servers',
            'Usage data: lesson progress, quiz results, earned certificates',
            'Communication data: messages exchanged between the student and instructor within the platform',
            'Technical data: IP address, browser type (collected solely for security and diagnostics)',
          ],
        )} />
      </SectionBlock>

      {/* 3 */}
      <SectionBlock heading={t('3. Svrha i pravna osnova obrade', '3. Purpose and Legal Basis')}>
        <P>{t('Vaše podatke obrađujemo za sljedeće svrhe:', 'We process your data for the following purposes:')}</P>
        <UL items={t(
          [
            'Izvršenje ugovora (čl. 6 st. 1 t. b GDPR-a): pružanje usluge e-učenja, pristup sadržaju, praćenje napretka, razmjena poruka',
            'Legitimni interes (čl. 6 st. 1 t. f GDPR-a): sigurnost platforme, sprječavanje zlouporabe, poboljšanje usluge',
            'Zakonska obveza (čl. 6 st. 1 t. c GDPR-a): porezna i računovodstvena dokumentacija u skladu s hrvatskim zakonodavstvom',
            'Privola (čl. 6 st. 1 t. a GDPR-a): slanje newslettera ili promotivnih e-mailova — samo uz vašu izričitu suglasnost',
          ],
          [
            'Performance of contract (Art. 6(1)(b) GDPR): providing the e-learning service, content access, progress tracking, messaging',
            'Legitimate interest (Art. 6(1)(f) GDPR): platform security, abuse prevention, service improvement',
            'Legal obligation (Art. 6(1)(c) GDPR): tax and accounting records in accordance with Croatian law',
            'Consent (Art. 6(1)(a) GDPR): sending newsletters or promotional emails — only with your explicit consent',
          ],
        )} />
      </SectionBlock>

      {/* 4 */}
      <SectionBlock heading={t('4. Dijeljenje podataka', '4. Data Sharing')}>
        <P>{t(
          'Ne prodajemo niti iznajmljujemo vaše osobne podatke trećim stranama. Podatke možemo dijeliti isključivo s:',
          'We do not sell or rent your personal data to third parties. We may share data only with:',
        )}</P>
        <UL items={t(
          [
            'Stripe Inc. (SAD) — procesor plaćanja, zaštićen standardnim ugovornim klauzulama EU',
            'Calendly (SAD) — raspoređivanje Zoom sesija, zaštićen standardnim ugovornim klauzulama EU',
            'Nodemailer / SMTP pružatelj usluga — slanje transakcijskog e-maila',
            'Nadležnim tijelima — isključivo na temelju zakonske obveze',
          ],
          [
            'Stripe Inc. (USA) — payment processor, protected by EU standard contractual clauses',
            'Calendly (USA) — Zoom session scheduling, protected by EU standard contractual clauses',
            'Nodemailer / SMTP provider — transactional email delivery',
            'Competent authorities — only when required by law',
          ],
        )} />
      </SectionBlock>

      {/* 5 */}
      <SectionBlock heading={t('5. Čuvanje podataka', '5. Data Retention')}>
        <UL items={t(
          [
            'Podaci računa: do brisanja računa ili najdulje 5 godina od posljednje aktivnosti',
            'Podaci o narudžbama i plaćanjima: 11 godina (zakonska obveza prema Zakonu o računovodstvu)',
            'Poruke: 2 godine od datuma slanja',
            'Tehnički logovi: 90 dana',
          ],
          [
            'Account data: until account deletion or up to 5 years after last activity',
            'Order and payment data: 11 years (statutory requirement under Croatian accounting law)',
            'Messages: 2 years from the date sent',
            'Technical logs: 90 days',
          ],
        )} />
      </SectionBlock>

      {/* 6 */}
      <SectionBlock heading={t('6. Vaša prava', '6. Your Rights')}>
        <P>{t(
          'Temeljem GDPR-a imate sljedeća prava koja možete ostvariti slanjem e-maila na adresu navedenou gore:',
          'Under the GDPR you have the following rights, which you may exercise by emailing the address above:',
        )}</P>
        <UL items={t(
          [
            'Pravo na pristup — kopija vaših podataka na zahtjev',
            'Pravo na ispravak — ispravak netočnih ili nepotpunih podataka',
            'Pravo na brisanje ("pravo na zaborav") — uz primjenu zakonskih iznimaka',
            'Pravo na ograničenje obrade',
            'Pravo na prenosivost podataka (strojno čitljiv format)',
            'Pravo na prigovor obradi temeljenoj na legitimnom interesu',
            'Pravo na opoziv privole — u svakom trenutku, bez utjecaja na zakonitost prethodne obrade',
          ],
          [
            'Right of access — copy of your data on request',
            'Right to rectification — correction of inaccurate or incomplete data',
            'Right to erasure ("right to be forgotten") — subject to legal exceptions',
            'Right to restriction of processing',
            'Right to data portability (machine-readable format)',
            'Right to object to processing based on legitimate interest',
            'Right to withdraw consent — at any time, without affecting the lawfulness of prior processing',
          ],
        )} />
        <P>{t(
          'Na zahtjev odgovaramo u roku od 30 dana. Ako smatrate da vaša prava nisu poštovana, možete podnijeti pritužbu Agenciji za zaštitu osobnih podataka (AZOP), Selska cesta 136, 10000 Zagreb, www.azop.hr.',
          'We respond to requests within 30 days. If you believe your rights have not been respected, you may lodge a complaint with the Croatian Personal Data Protection Agency (AZOP), Selska cesta 136, 10000 Zagreb, www.azop.hr.',
        )}</P>
      </SectionBlock>

      {/* 7 */}
      <SectionBlock heading={t('7. Kolačići (Cookies)', '7. Cookies')}>
        <P>{t(
          'Molekula Academy koristi isključivo funkcionalne kolačiće neophodne za rad platforme (npr. autentifikacijski JWT token pohranjen u localStorage). Ne koristimo reklamne niti analitičke kolačiće trećih strana.',
          'Molekula Academy uses only functional cookies necessary for the platform to operate (e.g. authentication JWT token stored in localStorage). We do not use third-party advertising or analytics cookies.',
        )}</P>
      </SectionBlock>

      {/* 8 */}
      <SectionBlock heading={t('8. Sigurnost podataka', '8. Data Security')}>
        <P>{t(
          'Provodimo tehničke i organizacijske mjere zaštite: HTTPS/TLS enkripcija u prijenosu, bcrypt hashiranje lozinki, ograničen pristup bazi podataka, redovite sigurnosne kopije.',
          'We implement technical and organisational security measures: HTTPS/TLS encryption in transit, bcrypt password hashing, restricted database access, and regular backups.',
        )}</P>
      </SectionBlock>

      {/* 9 */}
      <SectionBlock heading={t('9. Izmjene politike privatnosti', '9. Changes to This Policy')}>
        <P>{t(
          'Zadržavamo pravo izmjene ove Politike privatnosti. O značajnim izmjenama obavijestit ćemo vas e-mailom ili obavijesti unutar platforme najmanje 14 dana unaprijed.',
          'We reserve the right to amend this Privacy Policy. We will notify you of significant changes by email or in-app notice at least 14 days in advance.',
        )}</P>
      </SectionBlock>

    </div>
  );
}
