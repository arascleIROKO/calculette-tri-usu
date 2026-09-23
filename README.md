# Calculette TRI USU

Comparateur de TRI pour des investissements en usufruit (démembrement de parts SCPI),
sur le modèle de l'onglet `06.3 - USU TRI` du BP Iroko Next.

Iroko Zen et Iroko Atlas sont toujours proposés comme investissements de référence ;
n'importe quel autre investissement en usufruit (Epsicap Nano ou autre, montage
usufruit/nue-propriété ou usufruit/pleine propriété) peut être ajouté à la comparaison.

## Lancer en local

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Structure

- `app.py` — application Streamlit (interface de comparaison).
- `tri_core.py` — moteur de calcul (flux de trésorerie mensuels + XIRR), indépendant de Streamlit.
- `data/keys_demembrement.json` — barèmes de clés de démembrement (durée → % usufruit) et
  hypothèses par défaut d'Iroko Zen / Atlas, extraits une fois du BP Excel via
  `scripts/extract_key_grids.py`.
- `scripts/extract_key_grids.py` — script de (ré)extraction des barèmes depuis le BP `.xlsm`
  (à relancer si le BP est mis à jour ; le fichier `.xlsm` n'est jamais versionné).
- `Calculette_TRI_USU.ipynb` — notebook Jupyter équivalent, pour un usage exploratoire hors app.

## Méthodologie

- Coupon usufruit mensuel = `montant_usufruit × TD_net / clé_usufruit / 12`.
- Amortissement comptable linéaire de l'usufruit, capitalisé dans une poche de réemploi
  au taux de réemploi, restituée à l'échéance (`TRI blendé + réemploi`).
- Valeur terminale nue-propriété = `montant_NP / clé_NP`.
- Valeur terminale pleine propriété = parts PP valorisées au prix de part (éventuellement
  revalorisé chaque année pour le montage usufruit/pleine propriété).
- TRI calculés en XIRR sur les flux mensuels datés.

## Déploiement Streamlit Community Cloud

1. Pousser ce repo sur GitHub (déjà fait si vous lisez ceci depuis le repo distant).
2. Aller sur [share.streamlit.io](https://share.streamlit.io), se connecter avec le compte GitHub
   ayant accès au repo.
3. "New app" → sélectionner ce repo, la branche `main`, et `app.py` comme fichier principal.
4. Déployer. Le fichier `requirements.txt` à la racine est détecté automatiquement.

> Note : pour un repo **privé**, il faut un compte Streamlit Community Cloud relié à une
> organisation GitHub autorisée (ou un plan payant Streamlit). Pour un déploiement gratuit
> sans restriction, passer le repo en public au préalable.
