from datetime import datetime
from decimal import Decimal

from .models import EmissionsRecord


SAP_FUEL_FACTORS = {
    "diesel_liter": Decimal("2.680"),
    "petrol_liter": Decimal("2.310"),
}

UTILITY_FACTOR_KG_PER_KWH = Decimal("0.72")

TRAVEL_FACTORS = {
    "air_km": Decimal("0.146"),
    "hotel_night": Decimal("15.500"),
    "ground_km": Decimal("0.085"),
}


def parse_date(raw_value: str):
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%m/%d/%Y", "%Y%m%d"):
        try:
            return datetime.strptime(raw_value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unsupported date format: {raw_value}")


def normalize_sap_row(row):
    quantity = Decimal(str(row["menge"]))
    unit = row["meins"].strip().lower()
    material_group = row["matkl"].strip().lower()
    posting_date = parse_date(row["budat"])

    if unit in ("l", "liter"):
        normalized_unit = "liter"
        normalized_value = quantity
    elif unit in ("gal", "gallon"):
        normalized_unit = "liter"
        normalized_value = quantity * Decimal("3.78541")
    elif unit in ("kg",):
        normalized_unit = "kg"
        normalized_value = quantity
    else:
        raise ValueError(f"Unsupported SAP unit: {unit}")

    if material_group == "fuel":
        scope = EmissionsRecord.Scope.SCOPE_1
        category = EmissionsRecord.Category.FUEL
        factor_key = "diesel_liter" if normalized_unit == "liter" else None
        factor = SAP_FUEL_FACTORS.get(factor_key, Decimal("0.000"))
    else:
        scope = EmissionsRecord.Scope.SCOPE_3
        category = EmissionsRecord.Category.PROCUREMENT
        factor = Decimal("0.450")  # Simplified kgCO2e / kg for goods

    emissions = normalized_value * factor
    suspicious = ""
    if emissions > Decimal("10000"):
        suspicious = "Very high SAP line emissions"

    return {
        "activity_date": posting_date,
        "scope": scope,
        "category": category,
        "activity_value": quantity,
        "activity_unit_raw": unit,
        "normalized_value": normalized_value,
        "normalized_unit": normalized_unit,
        "emission_factor": factor,
        "emission_factor_unit": f"kgCO2e/{normalized_unit}",
        "emissions_kgco2e": emissions.quantize(Decimal("0.0001")),
        "suspicious_reason": suspicious,
    }


def normalize_utility_row(row):
    kwh = Decimal(str(row["consumption_kwh"]))
    bill_start = parse_date(row["bill_start"])
    bill_end = parse_date(row["bill_end"])

    emissions = kwh * UTILITY_FACTOR_KG_PER_KWH
    suspicious = ""
    if kwh <= 0:
        suspicious = "Non-positive electricity consumption"

    return {
        "activity_date": bill_end,
        "period_start": bill_start,
        "period_end": bill_end,
        "scope": EmissionsRecord.Scope.SCOPE_2,
        "category": EmissionsRecord.Category.ELECTRICITY,
        "activity_value": kwh,
        "activity_unit_raw": "kWh",
        "normalized_value": kwh,
        "normalized_unit": "kWh",
        "emission_factor": UTILITY_FACTOR_KG_PER_KWH,
        "emission_factor_unit": "kgCO2e/kWh",
        "emissions_kgco2e": emissions.quantize(Decimal("0.0001")),
        "suspicious_reason": suspicious,
    }


def normalize_travel_row(row):
    category = row["category"].strip().lower()
    raw_value = Decimal(str(row["activity_value"]))
    activity_date = parse_date(row["activity_date"])

    if category == "flight":
        factor = TRAVEL_FACTORS["air_km"]
        normalized_unit = "km"
        mapped_category = EmissionsRecord.Category.AIR_TRAVEL
    elif category == "hotel":
        factor = TRAVEL_FACTORS["hotel_night"]
        normalized_unit = "night"
        mapped_category = EmissionsRecord.Category.HOTEL
    else:
        factor = TRAVEL_FACTORS["ground_km"]
        normalized_unit = "km"
        mapped_category = EmissionsRecord.Category.GROUND_TRANSPORT

    emissions = raw_value * factor
    suspicious = ""
    if category == "flight" and raw_value < 100:
        suspicious = "Flight distance seems too low; verify route coding"

    return {
        "activity_date": activity_date,
        "scope": EmissionsRecord.Scope.SCOPE_3,
        "category": mapped_category,
        "activity_value": raw_value,
        "activity_unit_raw": row["activity_unit"],
        "normalized_value": raw_value,
        "normalized_unit": normalized_unit,
        "emission_factor": factor,
        "emission_factor_unit": f"kgCO2e/{normalized_unit}",
        "emissions_kgco2e": emissions.quantize(Decimal("0.0001")),
        "suspicious_reason": suspicious,
    }

