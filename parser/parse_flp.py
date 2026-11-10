#!/usr/bin/env python3
"""Read one .flp and print BPM, plugin names, and sample file names as JSON.

PyFLP opens the file with mode "rb" and parses a copy in memory. This script
never calls pyflp.save, so it cannot modify the project. Use a copy anyway
while we learn how your FL Studio version behaves.

    .venv/bin/python parser/parse_flp.py /path/to/copy.flp

Sample names are the file names stored on sampler channels and audio clips.
Samples packed inside a plugin (Serum, DirectWave, Slicex, and so on) are not
listed. PyFLP does not expose those.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pyflp
from pyflp.channel import Automation

# The VST host's own name. The real plugin name lives elsewhere.
WRAPPER_NAME = "Fruity Wrapper"


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: parse_flp.py PATH.flp", file=sys.stderr)
        sys.exit(2)

    # Keep names like "café hat.wav" intact if the terminal is not UTF-8.
    sys.stdout.reconfigure(encoding="utf-8")
    result = inspect_project(Path(sys.argv[1]))
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    sys.exit(0 if result["error"] is None else 1)


def inspect_project(path: Path) -> dict:
    result = {
        "file": str(path),
        "fl_version": None,
        "bpm": None,
        "plugins": [],
        "samples": [],
        "warnings": [],
        "error": None,
    }

    if not path.is_file():
        result["error"] = "File not found"
        return result

    try:
        project = pyflp.parse(path)
    except Exception as exc:  # one bad file should still produce JSON
        result["error"] = f"{type(exc).__name__}: {exc}"
        return result

    result["fl_version"] = read_text(lambda: str(project.version))
    result["bpm"] = read_value(lambda: project.tempo)

    plugins: set[str] = set()
    samples: set[str] = set()

    channels = collect(project, "channels", result["warnings"])
    for channel in channels:
        if isinstance(channel, Automation):
            continue
        label = plugin_label(channel)
        if label:
            plugins.add(label)
        sample = sample_name(channel)
        if sample:
            samples.add(sample)

    for insert in collect(project, "mixer", result["warnings"]):
        try:
            slots = list(insert)
        except Exception as exc:
            result["warnings"].append(f"mixer slot: {type(exc).__name__}: {exc}")
            continue
        for slot in slots:
            label = plugin_label(slot)
            if label:
                plugins.add(label)

    result["plugins"] = sorted(plugins, key=str.casefold)
    result["samples"] = sorted(samples, key=str.casefold)
    return result


def collect(project, attr: str, warnings: list) -> list:
    """Turn a PyFLP collection into a list. A broken section is a warning."""
    try:
        return list(getattr(project, attr))
    except Exception as exc:
        warnings.append(f"{attr}: {type(exc).__name__}: {exc}")
        return []


def plugin_label(holder) -> str | None:
    """Prefer the product name, then the plugin file name, then FL's internal name."""
    plugin = read_value(lambda: getattr(holder, "plugin", None))
    if plugin is not None:
        name = read_text(lambda: plugin.name)
        if name and name != WRAPPER_NAME:
            return name
        plugin_path = read_text(lambda: plugin.plugin_path)
        if plugin_path:
            file_name = basename(plugin_path)
            if file_name:
                return Path(file_name).stem or file_name

    internal = read_text(lambda: holder.internal_name)
    if internal and internal != WRAPPER_NAME:
        return internal
    return None


def sample_name(channel) -> str | None:
    sample_path = read_value(lambda: getattr(channel, "sample_path", None))
    if sample_path is None:
        return None
    return basename(sample_path)


def basename(value) -> str | None:
    """Last path piece, whether FL stored a Mac path or a Windows path."""
    text = str(value).replace("\\", "/").strip().rstrip("/")
    if not text or text == ".":
        return None
    name = text.split("/")[-1].replace("\x00", "").strip()
    return name or None


def read_text(getter) -> str | None:
    value = read_value(getter)
    if value is None:
        return None
    text = str(value).replace("\x00", "").strip()
    return text or None


def read_value(getter):
    """PyFLP raises when an event is missing or malformed. Skip that field."""
    try:
        return getter()
    except Exception:
        return None


if __name__ == "__main__":
    main()
