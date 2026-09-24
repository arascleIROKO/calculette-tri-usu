"""Consolide les collectes de barèmes SCPI (fichiers JSON bruts) en data/scpi_usufruit.json.

Usage : python scripts/build_scpi_db.py batch1.json batch2.json ...

Chaque fichier d'entrée est une liste d'objets
{scpi, societe_gestion, type, cles: {"3": 0.15, ...}, td_dernier, annee_td, prix_part,
 source_url, source_td_url, date_source, fiabilite, notes}.

Règles :
- une SCPI par nom normalisé ; la source "SGP officielle" prime sur "courtier" puis "incertain",
  à fiabilité égale le millésime le plus récent, puis le barème le plus complet ;
- TD / prix de part manquants complétés depuis les autres sources de la même SCPI ;
- clés hors ]0, 1[ écartées ; barème non croissant signalé (conservé, noté dans `notes`).
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "scpi_usufruit.json"
RANK = {"SGP officielle": 0, "courtier": 1, "incertain": 2}


# Anciens noms / variantes d'écriture -> identifiant retenu
ALIASES = {
    "fair-invest": "ncap-education-sante",
    "vendome-regions": "ncap-regions",
    "aestiam-placement-pierre": "aestiam-horizon",
    "buroboutic": "buroboutic-metropoles",
    "ficommerce": "ficommerce-proximite",
    "pfo2": "perial-o2",
    "pfo": "perial-opportunites-europe",
    "pf-grand-paris": "perial-grand-paris",
    "pf-hospitalite-europe": "perial-hospitalite-europe",
    "immorente-2": "sofiboutique",
    "novapierre-allemagne": "paref-prima",
    "interpierre-france": "paref-hexa",
    "primofamily": "praemia-hotels-europe",
}

# Souscription fermée ou suspendue (collecte 09/2026) : barème probablement inactif
STATUTS = {
    "primopierre": "Marché secondaire uniquement",
    "primovie": "Marché secondaire uniquement",
    "patrimmo-commerce": "Marché secondaire uniquement",
    "patrimmo-croissance-impact": "Marché secondaire uniquement",
    "lf-grand-paris-patrimoine": "Variabilité du capital suspendue",
    "selectinvest-1": "Variabilité du capital suspendue",
    "credit-mutuel-pierre-1": "Variabilité du capital suspendue",
    "paref-evo": "Démembrement possiblement fermé",
    "sofiboutique": "Démembrement possiblement fermé",
}

# SGP renseignées sans source par la collecte
SGP_NON_SOURCEES = {"fonciere-remusat", "novapierre-italie"}


def display_name(s: str) -> str:
    """Nom sans mention entre parenthèses (« (ex PFO) »)."""
    return re.sub(r"\s*\([^)]*\)", "", s).strip()


def slug(s: str) -> str:
    s = display_name(s).replace("&", " et ")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"^scpi\s+", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return ALIASES.get(s, s)


def clean_keys(raw: dict) -> dict[str, float]:
    out = {}
    for d, k in (raw or {}).items():
        try:
            d_int, k_f = int(float(d)), float(k)
        except (TypeError, ValueError):
            continue
        if k_f > 1:  # saisi en pourcentage
            k_f /= 100
        if 0 < k_f < 1 and 1 <= d_int <= 30:
            out[str(d_int)] = round(k_f, 4)
    return dict(sorted(out.items(), key=lambda kv: int(kv[0])))


def num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f


def main(paths: list[str]) -> None:
    by_id: dict[str, list[dict]] = {}
    for p in paths:
        for e in json.loads(Path(p).read_text(encoding="utf-8")):
            if not e.get("scpi"):
                continue
            e["cles"] = clean_keys(e.get("cles"))
            by_id.setdefault(slug(e["scpi"]), []).append(e)

    scpis = []
    for sid, entries in by_id.items():
        with_keys = [e for e in entries if e["cles"]]
        if not with_keys:
            continue
        with_keys.sort(key=lambda e: (RANK.get(e.get("fiabilite"), 3), -int(re.sub(r"\D", "", str(e.get("date_source") or "0"))[:6].ljust(6, "0")), -len(e["cles"])))
        best = with_keys[0]
        td = num(best.get("td_dernier"))
        if td is not None and td > 1:
            td /= 100
        prix = num(best.get("prix_part"))
        annee_td, src_td = best.get("annee_td"), best.get("source_td_url")
        for e in entries:
            if td is None and num(e.get("td_dernier")) is not None:
                td = num(e["td_dernier"])
                td = td / 100 if td > 1 else td
                annee_td, src_td = e.get("annee_td"), e.get("source_td_url") or e.get("source_url")
            if prix is None and num(e.get("prix_part")) is not None:
                prix = num(e["prix_part"])

        notes = [best.get("notes")] if best.get("notes") else []
        vals = list(best["cles"].values())
        if any(b < a for a, b in zip(vals, vals[1:])):
            notes.append("Barème non croissant avec la durée : à vérifier.")
        if sid in SGP_NON_SOURCEES:
            notes.append("Société de gestion non sourcée, à vérifier.")
        others = [e.get("source_url") for e in with_keys[1:] if e.get("source_url") != best.get("source_url")]
        if others:
            notes.append("Autres sources : " + ", ".join(dict.fromkeys(o for o in others if o)))

        scpis.append(
            {
                "id": sid,
                "nom": display_name(best["scpi"]),
                "sgp": (best.get("societe_gestion") or "").strip() or "—",
                "type": best.get("type"),
                "cles": best["cles"],
                "td": round(td, 5) if td is not None else None,
                "anneeTd": annee_td,
                "prixPart": prix,
                "sourceUrl": best.get("source_url") or "",
                "sourceTdUrl": src_td,
                "dateSource": str(best["date_source"]) if best.get("date_source") else None,
                "fiabilite": best.get("fiabilite") or "incertain",
                "notes": " ".join(notes) or None,
                "statut": STATUTS.get(sid),
            }
        )

    scpis.sort(key=lambda s: s["nom"].lower())
    db = json.loads(OUT.read_text(encoding="utf-8"))
    db["scpis"] = scpis
    OUT.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(scpis)} SCPI écrites dans {OUT}")
    for s in scpis:
        flag = " ⚠" if s["notes"] and "non croissant" in s["notes"] else ""
        print(f"  {s['nom']:<40} {s['sgp']:<28} {len(s['cles']):>2} durées  TD={s['td']}  prix={s['prixPart']}  [{s['fiabilite']}]{flag}")


if __name__ == "__main__":
    main(sys.argv[1:])
