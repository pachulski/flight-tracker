#!/usr/bin/env bash
# pre-bash-audit.sh — hook PreToolUse dla Claude Code
#
# Wejście: JSON na stdin z polami tool_name i tool_input.command
# Wyjście: exit 0 = zezwól, exit 2 = zablokuj (komunikat na stderr trafia do użytkownika)

set -euo pipefail

INPUT=$(cat)

# Wyciągnięcie komendy z payloadu JSON
COMMAND=$(echo "$INPUT" | python3 -c \
  "import sys, json; d=json.load(sys.stdin); print(d.get('tool_input', {}).get('command', ''))" \
  2>/dev/null || echo "")

# Logowanie do pliku audytu (nazwa pliku zawiera nazwę projektu).
# Awaria zapisu nie może przerwać skryptu — przy set -e ubiłaby wszystkie
# blokady poniżej, czyli hook cicho przestałby czegokolwiek pilnować.
# Nazwa bierze się z katalogu projektu, nie z katalogu roboczego: ten drugi
# może być podkatalogiem, a wtedy audyt jednego repo rozpadłby się na kilka
# plików i instrukcja weryfikacji („sprawdź ostatni wpis") przestałaby działać.
AUDIT_LOG="${HOME}/.claude/audit-$(basename "${CLAUDE_PROJECT_DIR:-$PWD}").log"
mkdir -p "$(dirname "$AUDIT_LOG")" 2>/dev/null || true
printf '%s CMD: %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$COMMAND" >> "$AUDIT_LOG" 2>/dev/null || true

# Odrzucenie zapisujemy DO LOGU, nie tylko na stderr. Bez tego log odpowiada
# wyłącznie na pytanie „czy hook się uruchomił", a po incydencie chce się
# wiedzieć, czy cokolwiek zostało zatrzymane i co. Zmierzone na tym repo:
# 748 wpisów CMD i ani jednego śladu czterech blokad, które faktycznie zaszły.
#
# Wpisy BLOCK są jedyną rzeczą w tym pliku, którą warto czytać, więc mają
# własny przedrostek — `grep BLOCK:` wystarcza za cały przegląd.
zablokuj() {
  printf '%s BLOCK: %s || %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$1" "$COMMAND" \
    >> "$AUDIT_LOG" 2>/dev/null || true
  echo "BLOCKED [pre-bash-audit]: $1" >&2
  exit 2
}

# Dozwolone wzorce URL dla curl/wget (precyzyjne ścieżki, ograniczone do znanych endpointów)
# api.clickup.com/api/v2: dodane za jawną zgodą użytkownika w sesji 2026-09-11 —
# tworzenie tasków w ClickUp pod epikiem PRO-28065 z planu wdrożenia dokumentacji.
ALLOWED_CURL_PATTERNS=(
  "api\.github\.com/(repos|orgs)/dietly/"
  "api\.clickup\.com/api/v2/"
)

# Blokada: żądania HTTP (curl/wget mogą eksfiltrować dane z kontekstu agenta)
if echo "$COMMAND" | grep -qE '^\s*(curl|wget)\s'; then
  for pattern in "${ALLOWED_CURL_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$pattern"; then
      exit 0
    fi
  done
  zablokuj "curl/wget wymaga ręcznego uruchomienia poza Claude Code."
fi

# Blokada: force push (nieodwracalna operacja na zdalnym repo)
if echo "$COMMAND" | grep -qE 'git\s+push.*(--force|-f\b)'; then
  zablokuj "wymuszony push wymaga ręcznego zatwierdzenia."
fi

# Blokada: rekurencyjne usuwanie. Dwa warunki muszą zajść naraz:
# 1) `rm` stoi na pozycji komendy (start, po separatorze, po -exec/xargs) —
#    inaczej blokada łapie samą wzmiankę o rm w tekście, np. w opisie commita;
# 2) flagi rekurencji i wymuszenia siedzą w jednej grupie — rozdzielone przez |
#    dopasowywały się niezależnie od rm i blokowały np. `tar -rf archive.tar`.
RM_POSITION='(^|[;&|]|`|\$\(|-exec[[:space:]]|xargs[[:space:]])[[:space:]]*(sudo[[:space:]]+)?rm[[:space:]]'
RM_FLAGS='(-[a-zA-Z]*[rR][a-zA-Z]*[fF]|-[a-zA-Z]*[fF][a-zA-Z]*[rR]|-[rR]\b.*-[fF]\b|-[fF]\b.*-[rR]\b|--recursive)'

if echo "$COMMAND" | grep -qE "${RM_POSITION}.*${RM_FLAGS}"; then
  zablokuj "rekurencyjne usuwanie wymaga ręcznego zatwierdzenia."
fi

# Wzorce plików sekretów (mirror reguł Read() z settings.json i .claudeignore).
# settings.json deny obejmuje tylko narzędzie Read — ten hook domyka pośredni
# odczyt/kopiowanie tych samych plików przez powłokę (cat/grep/cp/mv/sed/...).
SECRET_PATHS='(\.env($|[^a-zA-Z0-9_])|\.env\.|\.envrc|\.pem|\.key($|[^a-zA-Z0-9])|\.p12|\.pfx|\.jks|\.cer|\.crt|_rsa|_dsa|_ecdsa|_ed25519|secret[^/]*\.(ya?ml|json|env|toml)|\bsecrets?/|master\.key|credentials[^/]*\.(ya?ml|json|enc)|google-services\.json|GoogleService-Info\.plist|/\.aws/|/\.ssh/|/\.gnupg/|/\.config/gh/|/\.kube/|/\.azure/|/\.config/gcloud/|/\.gcloud/|/\.docker/config\.json|\.npmrc($|[^a-zA-Z0-9])|_history($|[^a-zA-Z0-9])|\.ipynb_checkpoints/|\.sqlite|\.db($|[^a-zA-Z0-9])|\.bak($|[^a-zA-Z0-9])|(backup|dump)[^/]*\.sql|appsettings\.Development\.json|local\.settings\.json)'
READ_CMDS='(cat|tac|nl|less|more|head|tail|grep|egrep|fgrep|rg|ag|awk|sed|xxd|hexdump|od|strings|cut|cp|mv|base64|sqlite3)'

# Blokada: pośredni odczyt/kopiowanie pliku sekretu przez powłokę. Tak jak przy
# rm, komenda czytająca musi stać w pozycji komendy, a wzorzec ścieżki — w tym
# samym segmencie ([^;&|]* nie przechodzi przez separator) i po jej nazwie.
# Dwa niezależne dopasowania „gdziekolwiek w komendzie" blokowały zestawienia
# bez związku: `npm ls x | tail -5 && node -e "Object.keys(y)"` łapało `tail`
# w jednym segmencie i `.keys(` w drugim.
READ_POSITION='(^|[;&|]|`|\$\(|-exec[[:space:]]|xargs[[:space:]])[[:space:]]*(sudo[[:space:]]+)?'"${READ_CMDS}"'\b'

if echo "$COMMAND" | grep -qE "${READ_POSITION}[^;&|]*${SECRET_PATHS}"; then
  zablokuj "pośredni dostęp do pliku sekretu przez powłokę jest zabroniony — uruchom ręcznie poza Claude Code."
fi

# find/xargs odwracają kolejność: ścieżka stoi PRZED komendą czytającą
# (`find . -name .env -exec cat {} \;`), więc warunek „ścieżka po nazwie"
# jej nie łapie. Dla tych dwóch przypadków sprawdzamy współwystępowanie
# w całej komendzie — wąsko, bo tylko gdy w grze jest -exec albo xargs.
if echo "$COMMAND" | grep -qE '(-exec[[:space:]]|(^|[;&|])[[:space:]]*xargs[[:space:]])' \
  && echo "$COMMAND" | grep -qE "\b${READ_CMDS}\b" \
  && echo "$COMMAND" | grep -qE "$SECRET_PATHS"; then
  zablokuj "pośredni dostęp do pliku sekretu przez find/xargs jest zabroniony — uruchom ręcznie poza Claude Code."
fi

# Blokada: zrzut zmiennych środowiskowych (mogą zawierać sekrety)
if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)(printenv\b|env\s*($|[|>]))' \
  || echo "$COMMAND" | grep -qE '/proc/[0-9]+/environ'; then
  zablokuj "zrzut zmiennych środowiskowych jest zabroniony (mogą zawierać sekrety)."
fi

# Blokada: ujawnienie historycznych sekretów / sekretów z metadanych
if echo "$COMMAND" | grep -qE 'git\s+log\b.*(-p\b|--patch\b)' \
  || echo "$COMMAND" | grep -qE 'docker\s+inspect\b'; then
  zablokuj "git log z łatką lub docker inspect mogą ujawnić sekrety — uruchom ręcznie poza Claude Code."
fi

# `git show <ref>:<ścieżka>` wyciąga treść pliku z historii, nie dotykając go
# na dysku — żadna komenda z READ_CMDS się nie pojawia, więc warunki wyżej tego
# nie widzą. Sprawdzone w praktyce: tą drogą odzyskaliśmy usunięty moduł, tą
# samą wyszedłby `.env`, gdyby kiedyś trafił do commita.
#
# Zostają dwie luki, świadomie nie zamykane, bo blokada byłaby szersza niż
# pożytek: `git show <commit>` bez ścieżki drukuje pełny diff (to samo ryzyko
# co git log z łatką, ale i codzienne narzędzie przeglądu), a `git cat-file -p`
# bierze surowy obiekt — po samym skrócie nie da się poznać, co to za plik.
if echo "$COMMAND" | grep -qE 'git\s+show\b' \
  && echo "$COMMAND" | grep -qE ":[^[:space:]]*${SECRET_PATHS}"; then
  zablokuj "odczyt pliku sekretu z historii gita jest zabroniony — uruchom ręcznie poza Claude Code."
fi

exit 0