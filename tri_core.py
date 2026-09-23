"""Moteur de calcul de TRI pour les investissements en usufruit (démembrement de parts SCPI).

Logique reprise à l'identique de l'onglet "06.3 - USU TRI" du BP Iroko Next :
- coupon usufruit mensuel = montant_usufruit x TD_net / clé_usufruit / 12
- amortissement comptable linéaire de l'usufruit, capitalisé dans une poche
  "réemploi" au taux_reemploi, restituée à l'échéance
- valeur terminale nue-propriété = montant_np / clé_np
- valeur terminale pleine propriété = parts PP valorisées au prix de part
  (éventuellement revalorisé chaque année)

Une même fonction générique `build_cashflows` couvre à la fois :
- un investissement 100% usufruit "pur" (part_usufruit = 1.0, ex. Iroko Zen/Atlas)
- un investissement démembré usufruit / nue-propriété (0 < part_usufruit < 1)
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd
import pyxirr

DATA_PATH = Path(__file__).parent / "data" / "keys_demembrement.json"


def load_key_data(path: Path = DATA_PATH) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    grids = {
        name: {int(duree): vals for duree, vals in grid.items()}
        for name, grid in raw["grids"].items()
    }
    return {"grids": grids, "presets": raw["presets"]}


def get_usu_key(duree_annees: int, grille: dict[int, dict]) -> tuple[float, float]:
    """Équivalent VLOOKUP(durée, grille, clé usufruit/NP, FALSE)."""
    if duree_annees not in grille:
        durees = sorted(grille)
        raise ValueError(
            f"Durée {duree_annees} ans absente du barème (durées disponibles : "
            f"{durees[0]}-{durees[-1]} ans)."
        )
    v = grille[duree_annees]
    return v["cle_usufruit"], v["cle_np"]


@dataclass
class Investment:
    nom: str
    ticket_total: float
    duree_annees: int
    part_usufruit: float  # 0..1, part du ticket en usufruit ; le reste en NP (ou PP si type_montage="usu_pp")
    prix_part: float
    td_net: float
    taux_reemploi: float = 0.04
    delai_jouissance_mois: int = 0
    date_investissement: str = "2027-01-01"
    grille: str = "epsicap_2026"  # nom de barème dans keys_demembrement.json, ou "manuel"
    cle_usufruit_manuelle: float | None = None  # utilisé si grille == "manuel"
    type_montage: str = "usu_np"  # "usu_np" (usufruit/nue-propriété) | "usu_pp" (usufruit/pleine propriété)
    croissance_prix_part: float = 0.0  # utilisé seulement si type_montage == "usu_pp"

    def resolve_cle(self, key_data: dict) -> tuple[float, float]:
        if self.grille == "manuel":
            if self.cle_usufruit_manuelle is None:
                raise ValueError(f"[{self.nom}] clé usufruit manuelle non renseignée.")
            k = self.cle_usufruit_manuelle
            return k, 1 - k
        grille = key_data["grids"][self.grille]
        return get_usu_key(self.duree_annees, grille)


def _monthly_dates(date_invest, n_months: int) -> pd.DatetimeIndex:
    return pd.date_range(pd.Timestamp(date_invest), periods=n_months + 1, freq="MS")


def build_cashflows_usu_np(inv: Investment, cle_usufruit: float, cle_np: float) -> pd.DataFrame:
    duree_mois = inv.duree_annees * 12
    montant_usu = inv.ticket_total * inv.part_usufruit
    montant_np = inv.ticket_total * (1 - inv.part_usufruit)
    delai = inv.delai_jouissance_mois

    coupon_annuel = montant_usu * inv.td_net / cle_usufruit
    amort_mensuel = montant_usu / duree_mois if duree_mois else 0.0
    valeur_np_terme = montant_np / cle_np if cle_np else 0.0

    dates = _monthly_dates(inv.date_investissement, duree_mois)
    rows = []
    poche_reemploi = 0.0
    for m in range(duree_mois + 1):
        if m == 0:
            flux_usu = -montant_usu
            flux_np = -montant_np
            flux_blend_reemploi = -(montant_usu + montant_np)
        else:
            coupon = coupon_annuel / 12 if (delai < m <= delai + duree_mois) else 0.0
            amort = amort_mensuel if m <= duree_mois else 0.0
            poche_reemploi = poche_reemploi * (1 + inv.taux_reemploi) ** (1 / 12) + amort
            flux_usu = coupon
            flux_np = valeur_np_terme if m == duree_mois else 0.0
            flux_blend_reemploi = coupon - amort + flux_np + (poche_reemploi if m == duree_mois else 0.0)

        flux_blend = flux_usu + flux_np
        rows.append(
            {
                "date": dates[m],
                "flux_usu": flux_usu,
                "flux_np": flux_np,
                "flux_blend": flux_blend,
                "flux_blend_reemploi": flux_blend_reemploi,
            }
        )
    return pd.DataFrame(rows)


def build_cashflows_usu_pp(inv: Investment, cle_usufruit: float) -> pd.DataFrame:
    duree_mois = inv.duree_annees * 12
    montant_usu = inv.ticket_total * inv.part_usufruit
    montant_pp = inv.ticket_total * (1 - inv.part_usufruit)

    nb_parts_usu = montant_usu / (inv.prix_part * cle_usufruit) if cle_usufruit else 0.0
    nb_parts_pp = montant_pp / inv.prix_part

    dates = _monthly_dates(inv.date_investissement, duree_mois)
    rows = []
    for m in range(duree_mois + 1):
        if m == 0:
            flux = -(montant_usu + montant_pp)
        else:
            annee = (m - 1) // 12
            prix_reval = inv.prix_part * (1 + inv.croissance_prix_part) ** annee
            dividende = (nb_parts_usu + nb_parts_pp) * prix_reval * inv.td_net / 12
            flux = dividende
            if m == duree_mois:
                prix_terme = inv.prix_part * (1 + inv.croissance_prix_part) ** inv.duree_annees
                flux += nb_parts_pp * prix_terme
        rows.append({"date": dates[m], "flux": flux})
    return pd.DataFrame(rows)


def xirr(df: pd.DataFrame, col: str) -> float | None:
    try:
        return pyxirr.xirr(df["date"], df[col])
    except Exception:
        return None


def compute_tri(inv: Investment, key_data: dict) -> dict:
    """Retourne un dict de TRI calculés pour un investissement, selon son type de montage."""
    cle_usufruit, cle_np = inv.resolve_cle(key_data)

    if inv.type_montage == "usu_np":
        cf = build_cashflows_usu_np(inv, cle_usufruit, cle_np)
        result = {
            "clé usufruit": cle_usufruit,
            "clé NP": cle_np,
            "TRI usufruit (cash)": xirr(cf, "flux_usu"),
            "TRI blendé": xirr(cf, "flux_blend"),
            "TRI blendé + réemploi": xirr(cf, "flux_blend_reemploi"),
        }
        if inv.part_usufruit < 1.0:
            result["TRI nue-propriété"] = xirr(cf, "flux_np")
        return result

    if inv.type_montage == "usu_pp":
        cf = build_cashflows_usu_pp(inv, cle_usufruit)
        return {
            "clé usufruit": cle_usufruit,
            "clé PP": cle_np,
            "TRI blendé (usu+PP)": xirr(cf, "flux"),
        }

    raise ValueError(f"type_montage inconnu : {inv.type_montage!r}")


def make_preset_investment(nom: str, key_data: dict, **overrides) -> Investment:
    """Construit un Investment à partir d'un preset (ex. 'Iroko Zen') du fichier de données."""
    preset = key_data["presets"][nom]
    kwargs = dict(
        nom=nom,
        ticket_total=preset["montant_usu"],
        duree_annees=preset["duree_annees"],
        part_usufruit=preset["part_usufruit"],
        prix_part=preset["prix_part"],
        td_net=preset["td_net"],
        taux_reemploi=preset["taux_reemploi"],
        delai_jouissance_mois=preset["delai_jouissance_mois"],
        grille=preset["grille"],
        type_montage="usu_np",
    )
    kwargs.update(overrides)
    return Investment(**kwargs)
