# FundToolBox

Boîte à outils web pour l'analyse de fonds. Premier outil : **comparateur de TRI usufruit**
(démembrement de parts SCPI), sur le modèle de l'onglet `06.3 - USU TRI` du BP Iroko Next.

Outils :
- **TRI Usufruit** : comparateur d'investissements usufruit / nue-propriété / pleine propriété, TRI par jambe,
  détail par clé, frais d'acquisition et rétrocession sur la NP / PP, classement sur toutes les SCPI du marché.
- **Meilleurs TRI par clé** : pour chaque durée (donc chaque clé), classement des SCPI du marché par TRI
  100 % usufruit avec leur TD publié, pour repérer les prochains investissements usufruit potentiels.
- **Clés d'usufruit** : base des barèmes de clés d'usufruit des SCPI du marché (avec TD et prix de part).

Iroko Zen et Iroko Atlas sont proposés comme investissements de référence ; n'importe quel
autre investissement (Epsicap Nano ou autre, montage usufruit/nue-propriété ou
usufruit/pleine propriété) peut être ajouté, dupliqué et modifié. Les calculs se font en direct
dans le navigateur, les investissements sont conservés localement (localStorage).

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests de parité avec le moteur Python
npm run build    # build statique dans dist/
```

## Structure

- `src/lib/usufruit.ts` — moteur de calcul (flux mensuels, clés de démembrement, TRI).
- `src/lib/xirr.ts` — XIRR (Newton + bissection, base Exact/365, identique à pyxirr / Excel).
- `src/lib/usufruit.test.ts` — tests vérifiant les TRI contre les valeurs de `tri_core.py`.
- `src/tools/usufruit/` — interface du comparateur.
- `data/keys_demembrement.json` — barèmes de clés (durée → % usufruit) et hypothèses Zen / Atlas,
  extraits du BP Excel via `scripts/extract_key_grids.py` (à relancer si le BP change ; le `.xlsm`
  n'est jamais versionné).
- `data/scpi_usufruit.json` — base des SCPI du marché (clés d'usufruit par durée, TD, prix de part, source,
  fiabilité, statut de souscription), consolidée depuis les collectes brutes `data/raw/*.json` par
  `python scripts/build_scpi_db.py data/raw/*.json`. Données publiques collectées en 09/2026 sur les sites des
  SGP et des courtiers : à revérifier avant tout engagement.
- `tri_core.py` + `Calculette_TRI_USU.ipynb` — moteur Python de référence et notebook exploratoire
  (`pip install -r requirements.txt`).

## Méthodologie

- Coupon usufruit mensuel = `montant_usufruit × TD_net / clé_usufruit / 12`.
- Valeur terminale nue-propriété = `montant_NP / clé_NP`.
- Valeur terminale pleine propriété = parts PP valorisées au prix de part (éventuellement
  revalorisé chaque année pour le montage usufruit/pleine propriété).
- Frais d'acquisition sur la NP / PP inclus dans le prix (sortie à la valeur de retrait) ; rétrocession en %
  du montant NP / PP, encaissée à l'investissement.
- TRI calculés en XIRR sur les flux mensuels datés. Le TRI principal est le TRI blendé (usufruit + NP / PP).

## Déploiement

Application 100 % statique : aucun serveur requis.

- **GitHub Pages** (configuré) : le workflow `.github/workflows/deploy.yml` teste, build et publie à
  chaque push sur `main`. À activer une fois dans *Settings → Pages → Source : GitHub Actions*.
  Sur un repo privé, GitHub Pages nécessite un plan GitHub payant (Team / Enterprise).
- **Alternatives** : Vercel, Netlify ou Cloudflare Pages — importer le repo, commande `npm run build`,
  dossier de sortie `dist`.
