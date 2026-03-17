"""
Upgrade 4 — Input Validation: sensor_validator.py
===================================================
Sanity-checks raw sensor readings before they reach any model.

A disconnected or malfunctioning sensor may return 0.0, NaN, or a value
outside physical possibility. Without this guard, the model silently
produces a wrong WQI — worse than no prediction.

Physical plausibility bounds are hardware limits, not biological limits:
  pH          : 0.0 – 14.0   (full acid-base scale)
  Temperature : 0.0 – 50.0°C (below freezing / above boiling for tank water)
  TDS         : 0.0 – 2000 ppm
  Turbidity   : 0.0 – 500 NTU

Usage
-----
    from src.sensor_validator import SensorValidator

    validator = SensorValidator()
    result = validator.validate(ph=7.0, temperature=24.0, tds=120, turbidity=3.0)

    if not result.is_valid:
        print(result.errors)   # ['temperature: NaN detected', ...]
        # fall back to rule_based_wqi or skip this reading
"""

import math
from dataclasses import dataclass, field

# ── Physical plausibility bounds ──────────────────────────────────────────────
PHYSICAL_BOUNDS: dict[str, tuple[float, float]] = {
    'ph':          (0.0,   14.0),
    'temperature': (0.0,   50.0),
    'tds':         (0.0, 2000.0),
    'turbidity':   (0.0,  500.0),
}


@dataclass
class ValidationResult:
    is_valid: bool
    errors:   list[str] = field(default_factory=list)

    def __str__(self) -> str:
        if self.is_valid:
            return 'ValidationResult: OK'
        return f'ValidationResult: INVALID — {"; ".join(self.errors)}'


class SensorValidator:
    """
    Validates raw sensor readings against physical plausibility bounds.

    Checks performed (in order):
      1. None / NaN detection
      2. Below physical minimum
      3. Above physical maximum
    """

    def validate(
        self,
        ph: float,
        temperature: float,
        tds: float,
        turbidity: float,
    ) -> ValidationResult:
        """
        Validate a single sensor reading.

        Parameters
        ----------
        ph          : float — pH value
        temperature : float — water temperature (°C)
        tds         : float — total dissolved solids (ppm)
        turbidity   : float — turbidity (NTU)

        Returns
        -------
        ValidationResult with is_valid=True if all checks pass,
        or is_valid=False with a list of human-readable error strings.
        """
        readings = {
            'ph':          ph,
            'temperature': temperature,
            'tds':         tds,
            'turbidity':   turbidity,
        }

        errors = []

        for sensor, value in readings.items():
            lo, hi = PHYSICAL_BOUNDS[sensor]

            # Check 1: None or NaN
            if value is None or (isinstance(value, float) and math.isnan(value)):
                errors.append(f'{sensor}: NaN / None detected — sensor may be disconnected')
                continue   # skip range check for this sensor

            # Check 2: Below physical minimum
            if value < lo:
                errors.append(
                    f'{sensor}: {value} is below physical minimum ({lo}) — hardware error'
                )

            # Check 3: Above physical maximum
            if value > hi:
                errors.append(
                    f'{sensor}: {value} exceeds physical maximum ({hi}) — hardware error'
                )

        return ValidationResult(is_valid=len(errors) == 0, errors=errors)


# ── Standalone demo ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    validator = SensorValidator()

    print('=== Sensor Validator — Demo ===\n')

    # Valid reading
    r = validator.validate(ph=7.0, temperature=24.0, tds=120, turbidity=3.0)
    print(f'Valid reading       : {r}')

    # pH out of range
    r = validator.validate(ph=-0.5, temperature=24.0, tds=120, turbidity=3.0)
    print(f'pH below 0          : {r}')

    # Disconnected temperature sensor (NaN)
    r = validator.validate(ph=7.0, temperature=float('nan'), tds=120, turbidity=3.0)
    print(f'Temp NaN (disconnect): {r}')

    # Multiple errors
    r = validator.validate(ph=15.0, temperature=55.0, tds=float('nan'), turbidity=3.0)
    print(f'Multiple errors     : {r}')
    for err in r.errors:
        print(f'  - {err}')
