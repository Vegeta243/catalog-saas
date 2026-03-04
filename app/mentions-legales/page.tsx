import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "#0f172a" }}>
            Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </nav>

      <article className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "#0f172a" }}>
          Mentions Légales
        </h1>
        <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>
          Dernière mise à jour : 1er janvier 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#374151" }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>1. Éditeur du site</h2>
            <p>Le site EcomPilot est édité par :</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Raison sociale</strong> : EcomPilot SAS</li>
              <li><strong>Forme juridique</strong> : Société par Actions Simplifiée (SAS)</li>
              <li><strong>Siège social</strong> : France</li>
              <li><strong>Directeur de la publication</strong> : À compléter</li>
              <li><strong>Email</strong> : <a href="mailto:contact@ecompilot.fr" className="underline" style={{ color: "#2563eb" }}>contact@ecompilot.fr</a></li>
            </ul>
            <p className="mt-2 text-xs p-2 rounded border" style={{ color: "#d97706", backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
              ⚠️ Ces informations sont provisoires. Les mentions légales doivent être complétées avec les données réelles de la société avant toute mise en ligne commerciale (SIRET, RCS, capital, dirigeant).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>2. Hébergeur</h2>
            <p>Le site est hébergé par :</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Vercel Inc.</strong></li>
              <li>340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
              <li>Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#2563eb" }}>vercel.com</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>3. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site EcomPilot (textes, images, graphismes, logo, icônes, sons, logiciels,
              etc.) est la propriété exclusive d&apos;EcomPilot SAS ou de ses partenaires et est protégé par les lois
              françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p className="mt-2">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments
              du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable
              d&apos;EcomPilot SAS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>4. Données personnelles</h2>
            <p>
              Pour toute information relative à la collecte et au traitement de vos données personnelles, veuillez consulter
              notre <Link href="/politique-confidentialite" className="underline" style={{ color: "#2563eb" }}>Politique de Confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>5. Cookies</h2>
            <p>
              Le site utilise des cookies. Pour en savoir plus sur leur utilisation et la gestion de vos préférences,
              veuillez consulter notre bandeau cookies présent sur le site ainsi que notre
              <Link href="/politique-confidentialite" className="underline ml-1" style={{ color: "#2563eb" }}>Politique de Confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>6. Limitation de responsabilité</h2>
            <p>
              EcomPilot SAS ne pourra être tenue responsable des dommages directs et indirects causés au matériel de
              l&apos;utilisateur lors de l&apos;accès au site, résultant soit de l&apos;utilisation d&apos;un matériel
              ne répondant pas aux spécifications techniques requises, soit de l&apos;apparition d&apos;un bug ou d&apos;une
              incompatibilité.
            </p>
            <p className="mt-2">
              EcomPilot SAS ne pourra également être tenue responsable des dommages indirects (tels par exemple
              qu&apos;une perte de marché ou perte d&apos;une chance) consécutifs à l&apos;utilisation du site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>7. Liens hypertextes</h2>
            <p>
              Le site peut contenir des liens hypertextes vers d&apos;autres sites. EcomPilot SAS n&apos;exerce aucun
              contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>8. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et après tentative de
              résolution amiable, les tribunaux compétents de Paris seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>9. Médiation</h2>
            <p>
              Conformément aux dispositions du Code de la consommation, le consommateur a le droit de recourir
              gratuitement à un médiateur de la consommation en vue de la résolution amiable du litige.
              Le médiateur désigné est accessible via la plateforme européenne de résolution des litiges :
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="underline ml-1" style={{ color: "#2563eb" }}>
                ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-gray-200 py-6 text-center">
        <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot — Tous droits réservés.</p>
      </footer>
    </div>
  );
}
