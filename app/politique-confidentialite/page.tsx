import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          Politique de Confidentialité
        </h1>
        <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>
          Dernière mise à jour : 4 mars 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#374151" }}>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est EcomPilot SAS, dont le siège social est situé
              à Paris, France. Contact : <a href="mailto:privacy@ecompilot.com" className="underline" style={{ color: "#2563eb" }}>privacy@ecompilot.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Données d&apos;identification</strong> : prénom, nom, adresse email</li>
              <li><strong>Données de connexion</strong> : adresse IP, type de navigateur, date et heure de connexion</li>
              <li><strong>Données d&apos;utilisation</strong> : actions effectuées sur la plateforme, tâches utilisées, fonctionnalités utilisées</li>
              <li><strong>Données de paiement</strong> : traitées directement par Stripe et PayPal (nous ne stockons pas les numéros de carte)</li>
              <li><strong>Données e-commerce</strong> : catalogues produits, boutiques connectées, URLs de boutiques</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>3. Finalités du traitement</h2>
            <p>Vos données sont traitées pour les finalités suivantes :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Création et gestion de votre compte utilisateur</li>
              <li>Fourniture du Service (optimisation IA, synchronisation boutiques, etc.)</li>
              <li>Gestion des abonnements et de la facturation</li>
              <li>Amélioration du Service et analyse d&apos;utilisation</li>
              <li>Communication relative au Service (notifications, mises à jour)</li>
              <li>Respect de nos obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>4. Base légale</h2>
            <p>Le traitement de vos données repose sur :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>L&apos;exécution du contrat</strong> : fourniture du Service auquel vous avez souscrit</li>
              <li><strong>Le consentement</strong> : pour les cookies non essentiels et les communications marketing</li>
              <li><strong>L&apos;intérêt légitime</strong> : amélioration du Service, prévention de la fraude</li>
              <li><strong>L&apos;obligation légale</strong> : conservation des données de facturation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>5. Sous-traitants et transferts</h2>
            <p>Nous faisons appel aux sous-traitants suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase</strong> (hébergement et base de données) — UE/US avec clauses contractuelles types</li>
              <li><strong>Stripe</strong> (paiement) — certifié PCI DSS</li>
              <li><strong>OpenAI</strong> (génération IA) — données traitées conformément à leur DPA</li>
              <li><strong>Vercel</strong> (hébergement) — infrastructure mondiale avec points de présence en UE</li>
            </ul>
            <p className="mt-2">
              Les transferts hors UE sont encadrés par des clauses contractuelles types (CCT) conformément au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>6. Durée de conservation</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Données de compte</strong> : conservées pendant toute la durée d&apos;utilisation du Service, puis 3 ans après la suppression du compte</li>
              <li><strong>Données de facturation</strong> : 10 ans (obligation légale)</li>
              <li><strong>Données de connexion</strong> : 12 mois</li>
              <li><strong>Cookies</strong> : 13 mois maximum</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>7. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@ecompilot.com" className="underline" style={{ color: "#2563eb" }}>privacy@ecompilot.com</a>.
              Nous répondrons dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>8. Cookies</h2>
            <p>
              Nous utilisons des cookies essentiels au fonctionnement du Service (authentification, préférences)
              et des cookies analytiques (avec votre consentement) pour améliorer le Service.
              Consultez notre bandeau cookies pour gérer vos préférences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>9. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
              chiffrement en transit (TLS/SSL), authentification sécurisée, accès restreints, journalisation des accès.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>10. Contact et réclamation</h2>
            <p>
              Pour toute question : <a href="mailto:privacy@ecompilot.com" className="underline" style={{ color: "#2563eb" }}>privacy@ecompilot.com</a>.
              Vous pouvez également introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique
              et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#2563eb" }}>www.cnil.fr</a>.
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
