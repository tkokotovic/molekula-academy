// Terms of Service — Croatian law (Zakon o elektroničkoj trgovini, Zakon o zaštiti potrošača)

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

export default function TermsPage() {
  const t = useT();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px' }}>

      <PageHeader
        title={t('Uvjeti korištenja', 'Terms of Service')}
        subtitle={t(
          `Zadnje ažuriranje: ${LAST_UPDATED}`,
          `Last updated: ${LAST_UPDATED_EN}`,
        )}
      />

      <InfoBox>
        {t(
          'Korištenjem platforme Molekula Academy prihvaćate ove Uvjete korištenja. Pružatelj usluge je fizička osoba koja obavlja djelatnost privatne pouke.',
          'By using the Molekula Academy platform you agree to these Terms of Service. The service is provided by an individual operating as a private tutor.',
        )}
      </InfoBox>

      {/* 1 */}
      <SectionBlock heading={t('1. Pružatelj usluge', '1. Service Provider')}>
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
      <SectionBlock heading={t('2. Predmet usluge', '2. Service Description')}>
        <P>{t(
          'Molekula Academy je online platforma za učenje kemije namijenjena učenicima IB programa, kandidatima za upis na medicinske i prirodoslovne fakultete te studentima. Platforma pruža:',
          'Molekula Academy is an online chemistry learning platform for IB students, medical and science university entrance candidates, and undergraduates. The platform provides:',
        )}</P>
        <UL items={t(
          [
            'Pisane lekcije i edukativni sadržaj podijeljen u tematske module',
            'Video lekcije (Premium plan)',
            'Kvizove i ispite za provjeru znanja (Premium plan)',
            'Praćenje napretka i digitalne certifikate',
            'Chat s nastavnikom unutar platforme',
            'Zakazivanje individualnih Zoom sesija (1 sesija/mjesec, Premium plan)',
          ],
          [
            'Written lessons and educational content organised in thematic modules',
            'Video lessons (Premium plan)',
            'Quizzes and practice exams (Premium plan)',
            'Progress tracking and digital certificates',
            'In-platform chat with the instructor',
            'Individual Zoom session scheduling (1 session/month, Premium plan)',
          ],
        )} />
      </SectionBlock>

      {/* 3 */}
      <SectionBlock heading={t('3. Registracija i korisnički račun', '3. Registration and Account')}>
        <P>{t(
          'Za korištenje platforme potrebna je registracija. Korisnik je dužan:',
          'Use of the platform requires registration. The user must:',
        )}</P>
        <UL items={t(
          [
            'Navesti točne i ažurne podatke pri registraciji',
            'Čuvati povjerljivost svojih podataka za prijavu',
            'Odmah obavijestiti pružatelja usluge o neovlaštenom korištenju računa',
            'Biti stariji od 16 godina ili imati suglasnost roditelja/skrbnika',
          ],
          [
            'Provide accurate and up-to-date information at registration',
            'Keep login credentials confidential',
            'Immediately notify the service provider of any unauthorised use of the account',
            'Be at least 16 years old or have parental/guardian consent',
          ],
        )} />
      </SectionBlock>

      {/* 4 */}
      <SectionBlock heading={t('4. Pretplatni planovi i plaćanje', '4. Subscription Plans and Payment')}>
        <UL items={t(
          [
            'Basic plan: €19/mjesec — pristup pisanim lekcijama i praćenju napretka',
            'Premium plan: €39/mjesec — sve Basic značajke + video lekcije, kvizovi, chat, 1 Zoom sesija/mjesec',
            'Plaćanje se naplaćuje unaprijed za svaki mjesec putem Stripea',
            'Pretplata se automatski obnavlja na kraju svakog obračunskog perioda',
            'Otkazivanje pretplate moguće je u svakom trenutku; pristup ostaje aktivan do kraja plaćenog perioda',
            'Povrat novca nije moguć za djelomično iskorišteni period pretplate, osim ako zakon drukčije ne nalaže',
          ],
          [
            'Basic plan: €19/month — access to written lessons and progress tracking',
            'Premium plan: €39/month — all Basic features + video lessons, quizzes, chat, 1 Zoom session/month',
            'Payment is charged in advance for each month via Stripe',
            'Subscription renews automatically at the end of each billing period',
            'Cancellation is possible at any time; access remains active until the end of the paid period',
            'Refunds are not available for partially used subscription periods, unless otherwise required by law',
          ],
        )} />
      </SectionBlock>

      {/* 5 */}
      <SectionBlock heading={t('5. Pravo na odustanak (potrošači u EU)', '5. Right of Withdrawal (EU Consumers)')}>
        <P>{t(
          'U skladu s Direktivom 2011/83/EU i Zakonom o zaštiti potrošača (NN 41/2014 i izmjene), potrošač ima pravo odustati od ugovora u roku od 14 dana od sklapanja ugovora bez navođenja razloga.',
          'In accordance with Directive 2011/83/EU and the Croatian Consumer Protection Act (Official Gazette 41/2014 and amendments), consumers have the right to withdraw from the contract within 14 days of conclusion without giving a reason.',
        )}</P>
        <P>{t(
          'Pravo na odustanak ne primjenjuje se ako je korisnik izričito zatražio početak izvršavanja usluge prije isteka roka za odustanak i potvrdio da je svjestan gubitka prava na odustanak. Odabirom plana i aktivacijom pristupa sadržaju korisnik daje takav zahtjev i potvrdu.',
          'The right of withdrawal does not apply if the user has explicitly requested the commencement of the service before the withdrawal period expires and acknowledged that they will lose the right of withdrawal. By selecting a plan and activating access to content the user gives such a request and acknowledgement.',
        )}</P>
      </SectionBlock>

      {/* 6 */}
      <SectionBlock heading={t('6. Pravila korištenja', '6. Acceptable Use')}>
        <P>{t('Korisnik se obvezuje da neće:', 'The user agrees not to:')}</P>
        <UL items={t(
          [
            'Dijeliti podatke za prijavu s trećim osobama',
            'Reproducirati, distribuirati ili prodavati sadržaj platforme bez pisanog odobrenja',
            'Koristiti platformu za bilo kakvu nezakonitu svrhu',
            'Pokušati neovlašteno pristupiti sustavima ili podacima platforme',
            'Ometati ili narušavati integritet ili performanse platforme',
          ],
          [
            'Share login credentials with third parties',
            'Reproduce, distribute, or sell platform content without written permission',
            'Use the platform for any unlawful purpose',
            'Attempt unauthorised access to platform systems or data',
            'Interfere with or disrupt the integrity or performance of the platform',
          ],
        )} />
        <P>{t(
          'Kršenje ovih pravila može rezultirati trenutnim ukidanjem pristupa bez prava na povrat novca.',
          'Violation of these rules may result in immediate suspension of access without a right to refund.',
        )}</P>
      </SectionBlock>

      {/* 7 */}
      <SectionBlock heading={t('7. Intelektualno vlasništvo', '7. Intellectual Property')}>
        <P>{t(
          'Sav sadržaj na platformi (tekstovi, video materijali, slike, kvizovi, struktura tečajeva) vlasništvo je Tomislava Kokotovića i zaštićen je autorskim pravom sukladno Zakonu o autorskom pravu i srodnim pravima (NN 167/2003 i izmjene).',
          'All content on the platform (texts, video materials, images, quizzes, course structure) is the property of Tomislav Kokotović and is protected by copyright under the Croatian Copyright and Related Rights Act (Official Gazette 167/2003 and amendments).',
        )}</P>
        <P>{t(
          'Korisnik stječe osobnu, neprenosivu i neekskluzivnu licenciju za pristup sadržaju isključivo u svrhu učenja.',
          'The user obtains a personal, non-transferable, and non-exclusive licence to access the content solely for learning purposes.',
        )}</P>
      </SectionBlock>

      {/* 8 */}
      <SectionBlock heading={t('8. Dostupnost i izmjene usluge', '8. Availability and Changes')}>
        <P>{t(
          'Pružatelj usluge nastoji osigurati neprekidnu dostupnost platforme, ali ne jamči je. Platforma može biti privremeno nedostupna zbog planiranog ili hitnog održavanja. Pružatelj usluge zadržava pravo izmjene sadržaja i funkcionalnosti platforme uz prethodnu obavijest korisnicima.',
          'The service provider aims to ensure continuous platform availability but does not guarantee it. The platform may be temporarily unavailable due to planned or emergency maintenance. The service provider reserves the right to change platform content and features with prior notice to users.',
        )}</P>
      </SectionBlock>

      {/* 9 */}
      <SectionBlock heading={t('9. Ograničenje odgovornosti', '9. Limitation of Liability')}>
        <P>{t(
          'Platforma pruža edukacijski sadržaj isključivo u informativne svrhe. Pružatelj usluge ne snosi odgovornost za ishode ispita ili testiranja korisnika. Odgovornost pružatelja usluge ograničena je na iznos plaćene pretplate za tekući mjesec, u mjeri dopuštenoj primjenjivim zakonodavstvom.',
          'The platform provides educational content for informational purposes only. The service provider is not liable for user exam or test outcomes. The service provider\'s liability is limited to the amount of the current month\'s subscription fee, to the extent permitted by applicable law.',
        )}</P>
      </SectionBlock>

      {/* 10 */}
      <SectionBlock heading={t('10. Mjerodavno pravo i rješavanje sporova', '10. Governing Law and Dispute Resolution')}>
        <P>{t(
          'Ovi Uvjeti korištenja uređuju se i tumače sukladno pravu Republike Hrvatske. Za rješavanje sporova nadležan je stvarno nadležan sud u Zagrebu, uz primjenu odredbi o zaštiti potrošača.',
          'These Terms of Service are governed by and construed in accordance with the laws of the Republic of Croatia. Disputes shall be subject to the jurisdiction of the competent court in Zagreb, with consumer protection provisions applied.',
        )}</P>
        <P>{t(
          'Potrošači imaju pravo na izvansudsko rješavanje sporova putem Centra za mirenje pri Hrvatskom uredu za osiguranje ili putem europske platforme za online rješavanje potrošačkih sporova (ODR platforma): https://ec.europa.eu/consumers/odr',
          'Consumers have the right to out-of-court dispute resolution through the Croatian Mediation Centre or via the European Online Dispute Resolution platform (ODR platform): https://ec.europa.eu/consumers/odr',
        )}</P>
      </SectionBlock>

      {/* 11 */}
      <SectionBlock heading={t('11. Izmjene Uvjeta korištenja', '11. Changes to These Terms')}>
        <P>{t(
          'Pružatelj usluge zadržava pravo izmjene ovih Uvjeta. O značajnim izmjenama korisnici će biti obaviješteni e-mailom ili obavijesti unutar platforme najmanje 14 dana unaprijed. Nastavak korištenja platforme nakon isteka tog roka smatra se prihvaćanjem izmjena.',
          'The service provider reserves the right to amend these Terms. Users will be notified of significant changes by email or in-app notice at least 14 days in advance. Continued use of the platform after that period constitutes acceptance of the changes.',
        )}</P>
      </SectionBlock>

    </div>
  );
}
