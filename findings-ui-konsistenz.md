# UI-Konsistenz-Review

Vollständige Durchsicht von `index.html` (Dashboard, Payment-Screen, Settings-Drawer, Schwein- & User-Onboarding, Goal-Reached-Sheet) auf Inkonsistenzen bei **Wording, Icons, Farben und Beschreibungstexten**. Reiner Befund — nichts wurde verändert. Format: Checkbox zum Abhaken, wenn wir es gemeinsam durchgehen; Status dahinter setzen wir dann gemeinsam (fix / bewusst so lassen / später).

Referenzen sind `index.html:Zeile`.

---

## 1. Wording / Bezeichnungen

- [x] **1.1 „Sparschwein" vs. „Schweinchen" — zwei Namen für dieselbe Sache.** → Erledigt: auf „Schweinchen" vereinheitlicht (Tagline, Karten-Label, Subpage-Titel + beide `aria-label`s).
  Der Root-Drawer nennt es „Sparschwein" (Tagline `1880`, Karten-Label `1888`, Subpage-Titel `1912`), praktisch überall sonst heißt es „Schweinchen" (Reset-Button `1920`/`989`, Passwort-Prompts `1296`/`1298`/`1323`, Celebration-Text `986`, Account-Karte-Desc `2051`, User-Onboarding-Hint `1071`, Reset-Confirm `2288`). Kein erkennbares Muster (z.B. „formell" vs. „umgangssprachlich"), wirkt wie zwei nie abgeglichene Textquellen.

- [x] **1.2 Passwort-Feld: „Einstellungs-Passwort" vs. „Schweinchen-Passwort".** → Erledigt: Drawer-Menüpunkt + Subpage-Titel auf „Einstellungs-Passwort" geändert.
  Onboarding-Step-Titel `1046`: „Einstellungs-Passwort festlegen"; beide `prompt()`-Dialoge (`1298`, `1323`) sagen „Einstellungs-Passwort"; aber der Drawer-Menüpunkt/Subpage-Titel (`1918`, `1992`) heißt „Schweinchen-Passwort". Gleiches Feld, zwei Namen.

- [x] **1.3 Bankkonto: „Bankkonto verknüpfen" vs. „Auszahlungs-Konto".** → Erledigt: Onboarding-Titel auf „Auszahlungs-Konto verknüpfen" geändert.
  Onboarding-Step-2-Titel (`1037`): „Bankkonto verknüpfen". Der Settings-Menüpunkt für exakt dasselbe Feld (`1916`, `1959`) heißt „Auszahlungs-Konto". Zwei Substantive für ein Konzept.

- [x] **1.4 Anzeigename: „Anzeigename" vs. „Nick-Name".** → Erledigt: Drawer-Menüpunkt/Subpage-Titel auf „Mein Anzeigename" geändert.
  Onboarding-Step-Titel „Wie dürfen wir dich nennen?" (`1070`), Placeholder „Dein Anzeigename" (`1072`), Hinweistext „Dieser Name…" (`1071`) — aber der Settings-Menüpunkt für dasselbe Feld heißt „Mein Nick-Name" (`2025`, `2033`), während der Placeholder dort weiterhin „Dein Anzeigename" ist (`2037`). Zusätzlich: „Nick-Name" ist ein Anglizismus mit Bindestrich, sonst kommt im Text kein vergleichbarer Anglizismus vor.

- [x] **1.5 „Mein Nick-Name" hat das Präfix „Mein", „Karte" nicht.** → Erledigt: Präfix bei beiden weggelassen, jetzt schlicht „Anzeigename".
  Im selben Account-Menü (`2025`–`2026`) ist ein Eintrag „Mein Nick-Name", der andere schlicht „Karte" (nicht „Meine Karte"). Uneinheitliches Präfix-Muster innerhalb derselben Liste.

- [x] **1.6 Karte vs. „Zahlungsmittel".** → Erledigt: einheitlich „Kreditkarte" in allen nutzersichtbaren Texten (Buttons, Hinweise, confirm()-Dialoge, Badge-Fallback).
  Überall in Labels/Buttons heißt es „Karte" („Karte hinterlegen", „Karte vergessen", „Karte speichern & weiter"), aber die zugehörigen `confirm()`-/Hinweistexte wechseln unvermittelt auf „Zahlungsmittel" (`2221`: „Zahlungsmittel auf diesem Gerät vergessen?", `2208`: „Kein Zahlungsmittel hinterlegt"). Gleiches Konzept, zwei Begriffe im selben Flow.

- [x] **1.7 Gendering uneinheitlich — drei verschiedene Strategien.** → Erledigt: durchgängig auf Doppelpunkt-Gendering umgestellt („Sparer:innen", „Besitzer:in", „Kontoinhaber:in"). „Jede Person" (Abrechnung) bewusst unverändert gelassen — bereits neutral formuliert, kein gegenderter Begriff nötig.
  - Binnen-I: „SparerInnen" (Dashboard-Stat, `869`)
  - Slash-Form: „Der Besitzer/die Besitzerin des Schweinchens entscheidet…" (`987`)
  - Neutral umformuliert: „Jede Person wird abgerechnet…" (`1981`)
  - Reine männliche Rollenbezeichnung ohne Gendering: „Kontoinhaber" (Placeholder, `1039`/`1963`)
  Vier unterschiedliche Ansätze im selben kleinen Interface, kein einheitlicher Stil.

- [x] **1.8 „Sparziel"-Seite enthält mehr als das Sparziel.** → Titel bleibt „Sparziel". Finale Lösung (nach Korrektur): kein separates „Zielbetrag"-Label — stattdessen heißt der Toggle selbst „Zielbetrag festlegen", direkt gefolgt vom Eingabefeld. Abstand zwischen „Worauf sparst du?"-Block und „Zielbetrag festlegen"-Block auf 16px gesetzt.
  Die Settings-Subpage heißt schlicht „Sparziel" (`1931`), enthält aber auch das Namensfeld („Worauf sparst du?", `1936`). Die eigene Seitenbeschreibung sagt das zwar dazu („Name und Sparziel dieses Schweinchens auf dem Dashboard.", `1932`), aber der Seitentitel selbst suggeriert nur den Betrag.

- [x] **1.9 „About" (Englisch) neben „Impressum"/„Hilfe & Kontakt" (Deutsch).** → Erledigt: auf „Über die App" geändert (Menüpunkt + Subpage-Titel).
  Root-Menü (`1897`–`1899`) mischt Sprachregister: „About", „Hilfe & Kontakt", „Impressum" — nur ein Eintrag ist englisch.

- [x] **1.10 Uneinheitliche Buttons für „Speichern & Weiter"-Aktionen.** → So belassen: Texte folgen tatsächlich unterschiedlichem Verhalten (speichern vs. speichern+weiterleiten vs. nur weiterleiten), keine echte Inkonsistenz.
  Settings-Formulare: generisches „Speichern" (`1949`, `1965`, `1982`, `1997`, `2038`). User-Onboarding-Kartenschritt: kein eigener Button, sondern der generische „Weiter"-Button wird umbenannt zu „Speichern & weiter" (`2408`). Payment-Card-Gate: eigener Button „Karte speichern & weiter" (`901`). Card-Settings-Leerzustand: „Karte hinterlegen" (`2209`) führt nur zur Karteneingabe, speichert selbst nichts. Vier verschiedene Formulierungen/Mechaniken für ähnliche „Bestätigen & weiter"-Momente.

- [x] **1.11 Erfolgsfeedback nach dem Speichern uneinheitlich.** → Erledigt: neue kleine Toast-Komponente (`showDrawerToast()`, „Gespeichert.") in Sparziel-, Auszahlungs-Konto-, Passwort-, Anzeigename- und Abrechnungs-Schwellenwert-Save ergänzt. Korrektur: Toast-Farbe zunächst identisch zu den Primär-Buttons (`--c-sheet-btn-bg`) — auf dezentes dunkles Snackbar-Design (`rgba(20,20,20,0.85)`, weißer Text, kein Fettdruck) umgestellt, damit er nicht mit CTAs verwechselt wird.
  `saveNameAndGoal`, `savePayoutAccount`, `saveSettingsPassword`, `account-nickname-save` schließen nach Erfolg einfach die Seite (`popDrawerPage()`), ohne Bestätigungstext. `chargeNow` dagegen zeigt explizit „X € erfolgreich abgerechnet." (`2258`). Manche Aktionen bestätigen sich selbst, andere nicht.

- [x] **1.12 Rohe Fehlermeldungen (teils Englisch) landen ungefiltert im UI.** → Erledigt: alle 6 Stellen (claimOwnershipFlow, withSettingsAuth, Karte-speichern im Payment-Gate, Passwort speichern, chargeNow, User-Onboarding-Kartenschritt) zeigen jetzt eine feste deutsche Fallback-Meldung; die echte Fehlermeldung geht weiterhin per `console.error` ins Debug-Log.
  Mehrere `status.textContent = e.message` (`1641`, `2178`, `2262`, `2472`) zeigen die rohe JS-/Stripe-Fehlermeldung an — die ist oft Englisch oder technisch, während der Rest der App konsequent Deutsch und nutzerfreundlich formuliert ist.

- [ ] **1.13 Natives `confirm()`/`prompt()`/`alert()` bricht mit dem gestalteten Look.** → Zurückgestellt: größerer Umbau (eigene Dialog-Komponente), separat angehen.
  Reset-Bestätigung (`2288`), Karte-vergessen-Bestätigung (`2221`), Passwort-Eingabe (`1298`, `1323`) und mehrere `alert()`-Fehlermeldungen (`1306`, `1331`, `1333`) laufen über ungestylte Browser-Dialoge, während für den strukturell ähnlichen „Sparziel erreicht"-Moment ein vollständig gebrandetes Bottom-Sheet existiert (`982`–`992`). Zwei Interaktionsebenen (Custom-UI vs. OS-Dialog) für vergleichbar wichtige Entscheidungen.

- [x] **1.14 Onboarding-Copy erklärt ausführlich, Settings-Copy dazu ist knapp — teils mit Informationsverlust.** → Erledigt: „Es gibt keine Passwort-Wiederherstellung…"-Warnung auch in den `desc`-Text der Einstellungs-Passwort-Seite übernommen.

- [ ] **1.15 Bankkonto-Hinweistext beschreibt eine echte Prüfung, die es nicht gibt.** → So belassen: bewusstes Acceptance-Test-Mockup, wird vor Go-Live durch echte Stripe-Connect-Integration ersetzt (siehe CLAUDE.md „Future Direction").
  Onboarding-Hinweis (`1038`): „Identität und Kontoinhaberschaft werden automatisch geprüft." Laut CLAUDE.md ist dieser Schritt aber ein reines Frontend-Mockup ohne jede echte Verifikation (`simulateAccountVerification()`, `2322`, simuliert nur eine Verzögerung). Der Text verspricht dem Nutzer aktiv etwas, das technisch nicht passiert.

---

## 2. Icons

- [x] **2.1 Icon-Dichte springt zwischen Hierarchie-Ebenen.** → So belassen: gängiges iOS-Settings-Muster (Icon-Karten nur auf oberster Ebene), keine Inkonsistenz.
  Nur die zwei Root-Karten „Sparschwein"/„Benutzer- & Zahlungsdaten" (`1886`–`1893`) haben Icons. Jede Subpage/jeder Listeneintrag darunter (Sparziel, Auszahlungs-Konto, Abrechnung, Passwort, Farbmodus, Nick-Name, Karte …) hat gar kein Icon, nur Text + Chevron. Wirkt wie eine bewusste Design-Entscheidung, lohnt sich aber gegenzuchecken — sonst könnte man auf Ebene 2 auch konsequent icon-los oder konsequent mit Icons arbeiten.

- [x] **2.2 „Test"-Badge ist nicht themed.** → Erledigt: auf `var(--c-badge-ok-bg)`/`var(--c-badge-ok-fg)` umgestellt, in beiden Schemata visuell geprüft (kein Clash mehr mit Schema 2's Gold).
  `.drawer-badge-test` (`737`–`741`) nutzt fest verdrahtete Farben (`#8a5a00` auf `#ffe6ad`), nicht die `--c-*`-Tokens. Sieht in Schema 1 (Koralle/Lila) vermutlich neutral aus, könnte in Schema 2 (Navy/Gold `#f2c94c`) mit dem Gold-Akzent kollidieren, da die Badge-Farbe zufällig ebenfalls ockergelb ist.

---

## 3. Farben

- [x] **3.1 `.drawer-card`-Hintergrund ist hartkodiert Weiß, Rahmen ist themed.** → Erledigt: `background: rgba(0,0,0,0.035)` (aktiv: `0.07`) statt `#fff` — hebt sich jetzt in beiden Schemata sichtbar vom Hintergrund ab, visuell geprüft.
  `766`–`769`: `background: #fff` fix, aber `border: 1px solid var(--c-card-border)` themed. Da der umgebende Drawer-Hintergrund in beiden Schemata ebenfalls ein sehr helles Creme ist (`--c-sheet-bg: #fffcf9` / `#fbffe3`), heben sich die Karten kaum vom Hintergrund ab — nur der (dünne) Rahmen zeigt die Kartenfläche überhaupt an.

- [x] **3.2 `.drawer-hero-tagline` ist hartkodiert `#333`, obwohl direkt daneben alles themed ist.** → Erledigt: auf `var(--c-muted)` umgestellt, visuell geprüft. Zusätzlich auf Wunsch: Tagline verkleinert (24px → 18px), Logo vergrößert (44px → 56px) für bessere Hierarchie auf dem Settings-Übersichtsscreen.
  `761`: `color: #333` statt z.B. `var(--c-strong-text)`. Der Abschnittstitel direkt darunter (`764`, `.drawer-section-title`) nutzt korrekt das Token. Die Tagline ändert bei Schema-Wechsel ihre Farbe nicht mit, der Rest der Root-Seite schon.

- [ ] **3.3 Eingabefelder/Card-Elemente sind hartkodiert Weiß statt themed.** → So belassen: bewusstes Kontrastmuster für Formularfelder, Unterschied zu `--c-sheet-bg` ist minimal.
  `.settings-input` (`443`), `.scheme-option` (`545`), `.settings-card-element` (`581`), `.card-display` (`560`) nutzen alle `background: #fff` bzw. `background: var(--... )` fehlt. In Schema 1 kaum sichtbar (Sheet-Bg ist `#fffcf9`, fast identisch), aber es ist inkonsistent, dass diese Flächen nicht über ein Token laufen wie der Rest.

- [ ] **3.4 Gleiche CSS-Klasse `.settings-charge`, zwei visuelle Stile.**
  Auf der Account-Karte-Seite ist `.settings-charge` ein Outline-Button (Rahmen `var(--c-strong-text)`, transparenter Hintergrund, `585`–`592`). Im Payment-Card-Gate wird dieselbe Klasse per Override zu einem gefüllten Primär-Button (`603`: Hintergrund `var(--c-sheet-bg-text)`/`--c-sheet-btn-bg`). Gleiche Komponente, zwei Bedeutungsebenen (sekundär vs. primär) ohne eigenen Klassennamen dafür — auf Dauer verwirrend beim Weiterbauen, und der Nutzer sieht „dieselbe" Kartenaktion in zwei Stilen.

- [ ] **3.5 Konfetti-Farbpalette ist in Schema 1 kaum bunt.**
  `spawnConfetti()` (`1724`) sampelt 5 Tokens: `--c-jar-name`, `--c-ring-fill`, `--c-thumb-ring`, `--c-panel-btn-bg`, `--c-amount-card-text`. In Schema 1 sind `--c-jar-name`, `--c-ring-fill` und `--c-amount-card-text` alle identisch `#340068` — von 5 „Konfetti-Farben" sind effektiv nur 3 unterschiedliche im Spiel (dunkles Lila, Rosa, Creme). Für einen Feier-Moment wirkt das ggf. weniger festlich/bunt als beabsichtigt.

---

## 4. Beschreibungstexte

- [ ] **4.1 Redundante Testphase-Hinweise.**
  „Farbmodus"-Menüpunkt hat sowohl das „Test"-Badge (`1919`) als auch einen expliziten `desc`-Satz „Nur für die Testphase sichtbar — später wird der Farbmodus fix vorgegeben." (`2006`). Nicht falsch, aber doppelt kommuniziert — keine große Sache, nur der Vollständigkeit halber erwähnt.

- [ ] **4.2 Leicht sperrige Formulierung.**
  `1932`: „Name und Sparziel dieses Schweinchens auf dem Dashboard." — grammatisch unklar, ob sich „auf dem Dashboard" auf „Sparziel" oder auf die ganze Aussage bezieht. Kandidat für eine Politur, kein strukturelles Problem.

- [ ] **4.3 Root-Drawer erwähnt „Hilfe & Kontakt" als fertigen Menüpunkt (`1898`, `2067`–`2071`), CLAUDE.md führt „Kontakt" aber noch als offenes TODO.**
  Kein UI-Text-Problem im engeren Sinn, aber falls das relevant ist: die Doku ist hier hinter dem Code zurück — nur als Fußnote, damit es nicht doppelt gebaut wird.

---

## Nicht aufgenommen (geprüft, aber für konsistent befunden)
Für Transparenz: folgende Dinge habe ich geprüft und *nicht* als Problem gewertet — falls du anderer Meinung bist, gerne reinnehmen:
- Card-Brand-Farben (Visa/Mastercard/…) sind absichtlich nicht themed (Markenfarben) — deckt sich mit CLAUDE.md.
- `DRAWER_LOGO_SVG` ist absichtlich nicht themed (Wortmarke) laut Code-Kommentar — im Gegensatz dazu sind die beiden Root-Card-Icons korrekt über `currentColor`/`--c-strong-text` themed.
- Deutsche Sentence-Case-Großschreibung bei Buttons ist durchgängig konsistent.
- Platzhalter „z.B. Urlaub" wird an beiden Stellen (Onboarding + Settings) identisch verwendet.
