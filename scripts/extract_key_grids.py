"""Extrait les barèmes de clés de démembrement (usufruit/NP) depuis le BP Excel
vers data/keys_demembrement.json, pour que l'app Streamlit soit autonome
(sans dépendre du fichier .xlsm, jamais versionné).

Exécuter: python scripts/extract_key_grids.py
"""
import json
import warnings
from pathlib import Path

import openpyxl
import openpyxl.worksheet.print_settings as _ps

_orig_from_string = _ps.PrintTitles.from_string.__func__


def _safe_from_string(cls, value):
    try:
        return _orig_from_string(cls, value)
    except Exception:
        return cls()


_ps.PrintTitles.from_string = classmethod(_safe_from_string)
warnings.filterwarnings("ignore", message="Cannot parse header or footer")

BP_PATH = Path("SCI Iroko Next - BP - V2026.09.11.xlsm")
BP_SHEET = "06.3 - USU TRI"
OUT_PATH = Path("data/keys_demembrement.json")


def read_grid(ws, rng, n_cols):
    rows = [[c.value for c in row] for row in ws[rng]]
    data = {}
    for row in rows[1:]:
        if row[0] is None:
            continue
        duree = int(row[0])
        cle_usufruit = float(row[1])
        cle_np = float(row[2]) if n_cols == 3 and row[2] is not None else round(1 - cle_usufruit, 6)
        data[duree] = {"cle_usufruit": cle_usufruit, "cle_np": cle_np}
    return data


def main():
    wb = openpyxl.load_workbook(BP_PATH, data_only=True, read_only=True)
    ws = wb[BP_SHEET]

    grids = {
        "zen_atlas": read_grid(ws, "G1:H19", 2),
        "epsicap_2026": read_grid(ws, "Y1:AA19", 3),
        "ancienne": read_grid(ws, "T1:U19", 2),
    }
    wb.close()

    presets = {
        "Iroko Zen": {
            "grille": "zen_atlas",
            "montant_usu": 166000,
            "duree_annees": 9,
            "prix_part": 205,
            "td_net": 0.055,
            "taux_reemploi": 0.04,
            "part_usufruit": 1.0,
            "delai_jouissance_mois": 0,
        },
        "Iroko Atlas": {
            "grille": "zen_atlas",
            "montant_usu": 166000,
            "duree_annees": 12,
            "prix_part": 200,
            "td_net": 0.07,
            "taux_reemploi": 0.04,
            "part_usufruit": 1.0,
            "delai_jouissance_mois": 0,
        },
    }

    OUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"grids": grids, "presets": presets}, f, ensure_ascii=False, indent=2)
    print("Écrit :", OUT_PATH.resolve())


if __name__ == "__main__":
    main()
