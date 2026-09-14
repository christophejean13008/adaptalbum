/* =====================================================================
   Relais Albert — Cloudflare Worker
   Sert à Adaptedl, Adaptalbum et aux outils suivants.

   Albert refuse les appels venus d'un navigateur. Ce relais les transmet
   depuis un serveur : la clé y est posée une seule fois, et l'iPad n'a
   plus rien à connaître.
   ===================================================================== */

const ALBERT = 'https://albert.api.etalab.gouv.fr/v1/chat/completions';

// Seules ces origines peuvent utiliser le relais : sans cela, n'importe qui
// découvrant l'adresse consommerait le quota d'agent de l'État.
// Une seule ligne suffit pour toutes les applications d'un même compte
// GitHub Pages. Pour un essai en local, ajouter l'adresse exacte affichée
// dans la barre du navigateur, port compris, par exemple
// 'http://127.0.0.1:25936' — à retirer une fois les essais terminés.
const ORIGINES = [
  'https://christophejean13008.github.io'
];

export default {
  async fetch(requete, env) {
    const origine = requete.headers.get('Origin') || '';
    const autorisee = ORIGINES.includes(origine);

    const entetes = {
      'Access-Control-Allow-Origin': autorisee ? origine : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json'
    };

    // requête préalable envoyée par le navigateur
    if (requete.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: entetes });
    }
    if (!autorisee) {
      return new Response(
        JSON.stringify({ error: 'origine non autorisée : ' + (origine || 'aucune') }),
        { status: 403, headers: entetes });
    }
    if (requete.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'méthode non autorisée' }),
        { status: 405, headers: entetes });
    }
    if (!env.CLE_ALBERT) {
      return new Response(JSON.stringify({ error: 'secret CLE_ALBERT absent du worker' }),
        { status: 500, headers: entetes });
    }

    let corps;
    try {
      corps = await requete.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'corps de requête illisible' }),
        { status: 400, headers: entetes });
    }

    let reponse;
    try {
      reponse = await fetch(ALBERT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + env.CLE_ALBERT
        },
        body: JSON.stringify(corps)
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Albert injoignable depuis le relais' }),
        { status: 502, headers: entetes });
    }

    const texte = await reponse.text();
    return new Response(texte, { status: reponse.status, headers: entetes });
  }
};
