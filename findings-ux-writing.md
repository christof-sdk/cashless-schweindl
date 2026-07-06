# UX-Writing-Review

Durchsicht aller nutzersichtbaren Texte in `index.html` (Labels, Hinweise, Platzhalter, Button-Beschriftungen, Dialoge, Fehlermeldungen) auf **Verständlichkeit, flüssige Formulierung und Konsistenz**. Andere Blickwinkel als `findings-ui-konsistenz.md` (die deckte primär Wording/Icons/Farben ab) — hier geht es um die Qualität und Klarheit einzelner Texte, nicht nur um Abgleich zwischen Instanzen. Reiner Befund, nichts verändert. Format wie gehabt: Checkbox zum Abhaken, Status setzen wir gemeinsam (fix / bewusst so lassen / später).

Referenzen sind `index.html:Zeile`.

---

## 1. Verständlichkeit

- [x] **1.1 Abrechnungs-Regel wird an zwei Stellen unterschiedlich vollständig erklärt.** → Erledigt: Text an `2011` ergänzt um die 30-Tage-Regel und vereinfacht auf „sobald deine Einzahlungen zusammen {X} übersteigen — spätestens aber nach 30 Tagen." Tippt man auf eine ausstehende (pending) Transaktion, erscheint: „Einzahlung erfasst: Die Abrechnung erfolgt, sobald die Summe der von einer Person eingezahlten Beträge {X} übersteigt." (`2014`) — das erwähnt nur die Schwellenwert-Regel. Die Settings-Seite „Abrechnung" beschreibt dieselbe Regel vollständig: „Jede Person wird abgerechnet, sobald ihr eigener offener Betrag diese Summe erreicht — spätestens aber nach 30 Tagen." (`2567`). Die 30-Tage-Regel fehlt in der ersten Erklärung komplett, obwohl beide dieselbe Logik in `api/charge-jar.js` beschreiben — wer nur die Tap-Erklärung sieht, bekommt ein unvollständiges Bild.
  Zusätzlich ist der Satz an `2014` selbst schwer lesbar: „die Summe der von einer Person eingezahlten Beträge" verschachtelt einen Relativsatz in einen Genitiv — eine direktere Formulierung (z.B. „sobald deine Einzahlungen zusammen {X} übersteigen") wäre leichter zu erfassen.

- [x] **1.2 Kreditkarten-Hinweis wirkte in sich widersprüchlich — und war auch inhaltlich nicht mehr korrekt.** → Erledigt. Ursprünglich: „Die Kreditkartendaten werden nur lokal auf diesem Gerät gespeichert — die eigentlichen Kreditkartendaten liegen ausschließlich bei Stripe, nie auf unserem Server." Beim Nachprüfen zeigte sich: „nur lokal" stimmte nicht mehr (laut CLAUDE.md ist `payerProfiles/{uid}` in Firebase mittlerweile die Source of Truth, `localStorage` nur noch Cache — ein Rest aus der Zeit vor der Migration), und lokal/Firebase gespeichert wird nicht nur Marke/Endziffern, sondern auch `customerId`/`paymentMethodId`. Neuer Text (`2854`, ohne Implementierungsdetail „Firebase", mit „Zahlungsdienstleister" statt „Stripe"): „Die Kartennummer sehen wir nie — die kennt nur unser Zahlungsdienstleister. Gespeichert wird hier nur eine Referenz sowie Kartentyp und die letzten vier Ziffern."

- [x] **1.3 Bankkonto-Hinweis verspricht eine Prüfung, die es (im aktuell aktiven Mockup-Modus) nicht gibt.** → So belassen, ok für die Testphase (deckt sich mit der alten Entscheidung zu 1.15 in `findings-ui-konsistenz.md`). „Identität und Kontoinhaberschaft werden automatisch geprüft." (`1370`), obwohl `simulateAccountVerification()` nur eine Verzögerung simuliert, solange `USE_REAL_CONNECT_ONBOARDING` aus ist — wird vor Go-Live durch die echte Connect-Integration ersetzt.

- [x] **1.4 „Kreditkarte hinterlegen" auf der Account-Seite klingt optional, ist aber beim nächsten Tap zwingend.** → Erledigt: Text (`2859`) auf „Du kannst deine Kreditkarte auch später hinterlegen — spätestens bei der ersten Einzahlung wird sie benötigt." geändert — macht klar, dass es ein Aufschieben, kein dauerhaftes Überspringen ist.

---

## 2. Flüssige Formulierung / Stil

- [x] **2.1 „Wieviel" als ein Wort — nach aktueller Rechtschreibung getrennt.** → Erledigt: `1348` auf „Wie viel möchtest du sparen?" geändert.

- [x] **2.2 Drei verschiedene Formulierungen für denselben Stripe-Connect-Zwischenstatus.** → Erledigt für die beiden echten Connect-Texte: Settings → Auszahlungs-Konto (`2784`) und Onboarding-Schritt 2 (`3039`) sagen jetzt beide „Angaben eingereicht — Prüfung durch Zahlungsdienstleister läuft." (gleicher „Zahlungsdienstleister"-Sprachgebrauch wie bei 1.2). Das simulierte Mockup (`3053`, „Konto wird geprüft …") bleibt bewusst unverändert — reiner Fake-Text für die Testphase, siehe 1.3.

- [x] **2.3 Ellipsen-Abstand uneinheitlich.** → Erledigt: `2900` auf „Rechne ab …" geändert (Leerzeichen vor „…", passend zu „Status wird geladen …", „Konto wird geprüft …", „Wird geladen …").

- [x] **2.4 Schluss-Button des Schwein-Onboardings („Fertig") vs. des User-Onboardings („Speichern & weiter") für strukturell denselben Moment.** → Erledigt: User-Onboarding-Kartenschritt (`3151`) auf „Fertig" vereinheitlicht, beide Onboarding-Flows enden jetzt mit demselben Button-Text.

---

## 3. Konsistenz (neu bzw. übersehen)

- [x] **3.1 Derselbe Toggle, zwei Labels — Regression aus der 1.8-Korrektur.** → Erledigt: Onboarding-Toggle (`1350`) von „Sparziel festlegen" auf „Zielbetrag festlegen" geändert, passend zum Settings-Wortlaut (`2513`). Veralteten Code-Kommentar (`696`) mit dem alten Beispieltext ebenfalls aktualisiert.

---

## Nicht aufgenommen (geprüft, aber für konsistent/unproblematisch befunden)
- Gendering (Doppelpunkt-Form) ist jetzt tatsächlich durchgängig — „Sparer:innen" (`1182`), „Besitzer:in" (`1288`), „Kontoinhaber:in" (`1372`, `2541`) stimmen alle überein.
- „Zahlungsmittel" kommt nur noch in einem Code-Kommentar vor (`1497`), nicht mehr in nutzersichtbarem Text — 1.6 aus dem alten Review hält.
- Die Duplizierung der Passwort-Wiederherstellungs-Warnung zwischen Onboarding und Settings ist laut altem Review (1.14) bewusst so gewollt — nicht erneut aufgenommen.
