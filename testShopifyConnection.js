import fetch from 'node-fetch';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL; // Utilisation de la variable d'environnement pour l'URL de la boutique Shopify

async function testShopifyConnection() {
  try {
    const response = await fetch(`${SHOPIFY_STORE_URL}/admin/api/2023-01/products.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_API_SECRET,
      },
    });

    if (!response.ok) {
      console.error('Erreur lors de la connexion à Shopify:', response.statusText);
      console.error('Code de statut:', response.status);
      const error = await response.json();
      console.error('Détails de l\'erreur:', error);
    } else {
      const data = await response.json();
      console.log('Connexion réussie à Shopify. Données reçues:', data);
    }
  } catch (error) {
    console.error('Erreur lors de la tentative de connexion à Shopify:', error);
  }
}

testShopifyConnection();