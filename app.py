"""Calculette TRI USU — comparateur d'investissements en usufruit (démembrement SCPI).

Lancer en local : streamlit run app.py
"""
from __future__ import annotations

import uuid

import pandas as pd
import streamlit as st

from tri_core import Investment, compute_tri, load_key_data, make_preset_investment

st.set_page_config(page_title="Calculette TRI USU", page_icon="📊", layout="wide")

key_data = load_key_data()
GRILLES = list(key_data["grids"].keys()) + ["manuel"]
GRILLE_LABELS = {
    "zen_atlas": "Iroko Zen / Atlas",
    "epsicap_2026": "Epsicap Nano 2026",
    "ancienne": "Ancienne grille",
    "manuel": "Clé manuelle",
}

st.title("📊 Calculette TRI USU")
st.caption(
    "Comparateur de TRI pour des investissements en usufruit (démembrement de parts SCPI), "
    "sur le modèle de l'onglet *06.3 - USU TRI* du BP Iroko Next."
)


def _default_investments() -> list[Investment]:
    return [
        make_preset_investment("Iroko Zen", key_data),
        make_preset_investment("Iroko Atlas", key_data),
    ]


if "investments" not in st.session_state:
    st.session_state.investments = _default_investments()
    st.session_state.ids = [str(uuid.uuid4()) for _ in st.session_state.investments]


def add_investment(inv: Investment):
    st.session_state.investments.append(inv)
    st.session_state.ids.append(str(uuid.uuid4()))


def remove_investment(idx: int):
    st.session_state.investments.pop(idx)
    st.session_state.ids.pop(idx)


with st.sidebar:
    st.header("Ajouter un investissement")
    with st.form("add_form", clear_on_submit=True):
        nom = st.text_input("Nom", value=f"Investissement {len(st.session_state.investments) + 1}")
        ticket = st.number_input("Ticket investi (€)", min_value=0, value=1_000_000, step=50_000)
        duree = st.number_input("Durée (années)", min_value=1, max_value=30, value=3)
        type_montage = st.selectbox(
            "Type de montage",
            ["usu_np", "usu_pp"],
            format_func=lambda x: "Usufruit / Nue-propriété" if x == "usu_np" else "Usufruit / Pleine propriété",
        )
        part_usufruit = st.slider("Part du ticket en usufruit", 0.0, 1.0, 0.5, step=0.05)
        grille = st.selectbox("Barème de clé", GRILLES, format_func=lambda g: GRILLE_LABELS.get(g, g))
        cle_manuelle = None
        if grille == "manuel":
            cle_manuelle = st.number_input("Clé usufruit manuelle", min_value=0.0, max_value=1.0, value=0.20, step=0.01)
        prix_part = st.number_input("Prix de part (€)", min_value=1.0, value=250.0, step=1.0)
        td_net = st.number_input("TD net (%)", min_value=0.0, max_value=20.0, value=5.5, step=0.1) / 100
        taux_reemploi = st.number_input("Taux de réemploi (%)", min_value=0.0, max_value=20.0, value=4.0, step=0.1) / 100
        delai = st.number_input("Délai de jouissance (mois)", min_value=0, max_value=36, value=0)
        date_invest = st.date_input("Date d'investissement", value=pd.Timestamp("2027-01-01"))
        croissance = 0.0
        if type_montage == "usu_pp":
            croissance = st.number_input("Croissance annuelle du prix de part (%)", value=0.0, step=0.1) / 100

        submitted = st.form_submit_button("➕ Ajouter à la comparaison")
        if submitted:
            add_investment(
                Investment(
                    nom=nom,
                    ticket_total=ticket,
                    duree_annees=int(duree),
                    part_usufruit=part_usufruit,
                    prix_part=prix_part,
                    td_net=td_net,
                    taux_reemploi=taux_reemploi,
                    delai_jouissance_mois=int(delai),
                    date_investissement=str(date_invest),
                    grille=grille,
                    cle_usufruit_manuelle=cle_manuelle,
                    type_montage=type_montage,
                    croissance_prix_part=croissance,
                )
            )
            st.rerun()

    st.divider()
    if st.button("↺ Réinitialiser (Zen + Atlas)"):
        st.session_state.investments = _default_investments()
        st.session_state.ids = [str(uuid.uuid4()) for _ in st.session_state.investments]
        st.rerun()

st.subheader("Investissements comparés")

if not st.session_state.investments:
    st.info("Ajoutez un investissement depuis le panneau de gauche.")
else:
    rows = []
    errors = []
    for i, inv in enumerate(st.session_state.investments):
        cols = st.columns([3, 2, 1, 1, 1, 1, 1])
        cols[0].markdown(f"**{inv.nom}**")
        cols[1].write(GRILLE_LABELS.get(inv.grille, inv.grille))
        cols[2].write(f"{inv.ticket_total:,.0f} €".replace(",", " "))
        cols[3].write(f"{inv.duree_annees} ans")
        cols[4].write(f"{inv.part_usufruit:.0%} usu")
        cols[5].write("Usu/NP" if inv.type_montage == "usu_np" else "Usu/PP")
        if cols[6].button("🗑️", key=f"del_{st.session_state.ids[i]}"):
            remove_investment(i)
            st.rerun()

        try:
            tri = compute_tri(inv, key_data)
            row = {"Investissement": inv.nom, "Ticket": inv.ticket_total, "Durée": inv.duree_annees}
            row.update(tri)
            rows.append(row)
        except Exception as e:
            errors.append(f"**{inv.nom}** : {e}")

    for err in errors:
        st.error(err)

    if rows:
        st.divider()
        st.subheader("Résultats")
        df = pd.DataFrame(rows).set_index("Investissement")

        pct_cols = [c for c in df.columns if "TRI" in c or "clé" in c]
        display_df = df.copy()
        for c in pct_cols:
            display_df[c] = display_df[c].map(lambda x: f"{x:.2%}" if pd.notna(x) else "—")
        display_df["Ticket"] = display_df["Ticket"].map(lambda x: f"{x:,.0f} €".replace(",", " "))
        st.dataframe(display_df, use_container_width=True)

        chart_col = next((c for c in ["TRI blendé + réemploi", "TRI blendé (usu+PP)", "TRI blendé"] if c in df.columns), None)
        if chart_col:
            st.bar_chart(df[chart_col].rename(chart_col))

st.divider()
with st.expander("ℹ️ Méthodologie"):
    st.markdown(
        """
        - **Coupon usufruit mensuel** = `montant_usufruit × TD_net / clé_usufruit / 12`, versé du mois de
          délai de jouissance jusqu'à l'échéance.
        - **Amortissement comptable linéaire** de l'usufruit, capitalisé dans une poche de réemploi au
          taux de réemploi, restituée à l'échéance (calcul du *TRI blendé + réemploi*).
        - **Valeur terminale nue-propriété** = `montant_NP / clé_NP`.
        - **Valeur terminale pleine propriété** = parts PP valorisées au prix de part (éventuellement
          revalorisé chaque année pour le montage Usufruit/Pleine propriété).
        - Les clés de démembrement (barème durée → % usufruit) sont figées dans `data/keys_demembrement.json`,
          extraites du BP Iroko Next (onglet *06.3 - USU TRI*).
        - Les TRI sont calculés en XIRR (flux mensuels datés).
        """
    )
