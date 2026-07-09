# Review: neue Texte (Welcome/Landing, „Das ist Oggy", Jars-Übersicht, Reset-Dialoge)

Fokus auf alles, was seit den letzten beiden Reviews (`findings-ui-konsistenz.md`, `findings-ux-writing.md`) neu dazugekommen ist: Welcome-Screen-Benefit-Copy, „Das ist Oggy"-Seite, Landing-Page (`/`), Jars-Übersicht (`/jars`) und die überarbeiteten Reset-/Karte-vergessen-Dialoge. Geprüft auf **Bezeichnungs-Inkonsistenzen**, **holprige Formulierungen** und **ob die Oggy-Benefit-Aussagen durchgängig und faktisch gedeckt sind**. Reiner Befund, nichts verändert. Format wie gehabt: Checkbox zum gemeinsamen Abhaken.

Referenzen sind `index.html:Zeile`.

---

## 1. Oggy-Aussagen — inhaltlich nicht (mehr) gedeckt

- [x] **1.1 (Geld-relevant) Reset-Dialog verspricht eine Auszahlung, die es nicht gibt.** → So belassen: bewusst zukunftsgerichtete Copy für den Prototyp/Acceptance-Testing. Das Auszahlungskonto ist im Prototyp noch nicht echt angebunden (nur gemockt, siehe „Per-Owner Payouts" in CLAUDE.md) — die Aussage beschreibt das *Zielverhalten*, nicht den heutigen Ist-Zustand. Für die Testphase ausreichend, muss aber spätestens vor Go-Live (sobald echte Payouts stehen) gegen die tatsächliche Implementierung geprüft werden, damit das Versprechen dann auch stimmt.
  Sowohl der Owner-Bestätigungsdialog (`3308`) als auch der Payer-Hinweis nach einem Reset (`3673`) sagen wortgleich: „Keine Sorge, alle angesparten Beträge werden vollständig auf das angegebene Konto ausgezahlt." `resetJar()` (`3307`–`3334`) archiviert aktuell nur die Jar-Daten nach `/archive/{id}/{timestamp}` und setzt `onboarded: false`, ohne Stripe-Payout-Call.

- [x] **1.2 „Das ist Oggy" verspricht ein Erinnerungs-Feature, das nicht existiert.** → So belassen: geplant für die Hardware-Integrationsphase (Sensoren etc.), Code wird dann entsprechend nachgezogen. Copy beschreibt bewusst das Zielprodukt, nicht den aktuellen Prototyp-Stand.
  „OGGY erinnert euch spielerisch daran, wenn ihr eine Weile nichts eingezahlt habt" (`2877`). Im Code gibt es aktuell keinerlei Reminder-/Notification-/Push-Mechanismus — CLAUDE.md führt „Sound-on-tap and proximity/push settings" bislang nur als offenes TODO.

---

## 2. Bezeichnungen / Wording

- [x] **2.1 „Jars-Übersicht" (Englisch) für eine Seite, die sich selbst „Alle Schweinchen" nennt.** → Erledigt: beide Stellen (Icon-Tooltip `1269`, Passwort-Prompt `3895`) auf „Schweinchen-Übersicht" geändert.
  Der Gear-Icon-Button auf der Landing-Page (`title="Jars-Übersicht"`, `1269`) und der Passwort-Prompt dorthin („Passwort für die Jars-Übersicht eingeben:", `3895`) nannten die Zielseite „Jars-Übersicht" — die Seite selbst trägt aber den Titel „Alle Schweinchen" (`1328`), und jeder andere Icon-Button-Tooltip in der App ist konsequent Deutsch („Kreditkarte hinterlegen", „Menü", `1341`/`1352`). Gleiches Muster wie das früher gelöste „About"-Problem (1.9 im alten Review).

- [x] **2.2 Zwei Verben fürs Anlegen eines neuen Schweinchens.** → So belassen: unterschiedliche Vorgänge (voller geführter Onboarding-Flow vs. reine Admin-Schnellanlage ohne Onboarding), verdienen unterschiedliche Verben. Der Jars-Übersicht-Text ist ohnehin nur ein `aria-label` (kein sichtbarer Button-Text).
  Welcome-Screen-CTA: „Schweinchen einrichten" (`3646`). Jars-Übersicht-Button: „Neues Schweinchen anlegen" (`1331`).

- [x] **2.3 „Kreditkarte vergessen" (Button) vs. „...wirklich entfernen?" (Dialog) — Regression aus der Dialog-Überarbeitung.** → Erledigt: Dialogtext (`3239`) auf „vergessen" zurückformuliert, passend zum Button.
  Der Drawer-Menüpunkt/Button heißt durchgängig „Kreditkarte vergessen" (`3222`), der zugehörige, kürzlich umformulierte Bestätigungsdialog fragte aber „Willst du die Kreditkarte wirklich entfernen?" (`3239`, aus Commit `e7f16c0`). Vorher stimmten Button- und Dialogtext überein (beide „vergessen"). Jetzt zwei Verben für dieselbe Aktion im selben Klickpfad.

- [x] **2.4 Anrede-Wechsel auf der „Das ist Oggy"-Seite — drei Formen auf einer Seite.** → Erledigt: „du" bleibt der App-weite Standard (man kann auch alleine sparen), Plural nur dort, wo es explizit um mehrere Personen im Haushalt geht. Konkret: Intro (`2873`) bleibt/wird „für **deine** Wohnung"; Bullet 2 (`2876`) bleibt Plural „Alle im Haushalt können mitmachen, wann immer sie vorbeikommen" (kein generisches Maskulinum mehr, bewusste Ausnahme); Bullet 3 (`2877`) zurück auf „OGGY erinnert **dich** spielerisch daran, wenn **du** eine Weile nichts eingezahlt hast"; Schlussabsatz (`2879`) bleibt Singular „**Du** richtest ein Sparziel ein... stellst OGGY irgendwo hin, wo **du** täglich vorbeikommst...".
  Ursprünglich: Intro „für **eure** Wohnung" (Plural, `2873`) und Bullet „OGGY erinnert **euch**" (Plural, `2877`) standen neben Bullet 2 mit generischem Maskulinum „...wann immer **er** vorbeigeht" (`2876`) und dem Schlussabsatz, der zu Singular „**Du** richtest ein Sparziel ein..." wechselte (`2879`). Drei verschiedene Anredeformen für dieselbe Zielgruppe auf einer einzigen Seite.

- [x] **2.5 Tagline „deine Wohnung" (Singular) vs. About-Seite „eure Wohnung" (Plural).** → So belassen: Tagline bleibt bewusst „du"/„deine Wohnung" — man kann auch alleine sparen, „du" ist der richtige App-weite Standard. Durch die 2.4-Entscheidung (About-Seite zurück auf „du" außer bei der expliziten Haushalts-Bullet) sind beide Stellen jetzt ohnehin wieder deckungsgleich, kein Widerspruch mehr.
  Welcome-/Landing-Tagline: „Das bargeldlose Sparschwein für **deine** Wohnung." (`1247`, `1298`). About-Seite-Intro: „Das digitale Sparschwein für **deine** Wohnung." (`2873`, nach 2.4-Fix).

---

## 3. Holprige/uneinheitliche Kleinigkeiten

- [x] **3.1 Generischer Fehlertext ohne den sonst üblichen zweiten Satz.** → Erledigt: an allen drei Stellen (`3936`, `3986`, `4012`) „Bitte versuch's erneut." ergänzt, jetzt deckungsgleich mit dem app-weiten Muster.
  Die drei neuen Jars-Übersicht-Fehlerfälle zeigten nur „Da ist leider etwas schiefgelaufen.", ohne das sonst app-weit angehängte „Bitte versuch's erneut." (siehe 1.12 im alten Review, dort für 6 Stellen einheitlich eingeführt).

- [x] **3.2 Uneinheitliche Einleitung bei Bestätigungsdialogen.** → Erledigt: Lösch-Dialog (`3925`) auf „Willst du das Schweinchen '{name}' wirklich löschen? Das kann nicht rückgängig gemacht werden." angeglichen.
  Die beiden neu umformulierten Dialoge starteten mit „Willst du... wirklich...?" (`3239`, `3308`), der Lösch-Dialog in der Jars-Übersicht kam dagegen ohne einleitendes Verb direkt zur Sache: „Schweinchen 'X' wirklich löschen?" (`3925`). Kleinigkeit, aber alle drei sitzen thematisch nah beieinander (Settings/Jars-Übersicht).

---

## Eingeordnet, aber nicht aufgenommen
- „Kein Bargeld, kein Login" (`2875`) — geprüft, deckt sich mit dem tatsächlichen Access-Modell (keine Accounts) und der übrigen Copy, kein Widerspruch.
- Passwort-Prompt-Formulierung „Passwort für X eingeben:" (`3895`) folgt korrekt dem etablierten Muster aus `1885`/`1911` — nur der Begriff „Jars-Übersicht" selbst ist das Problem (siehe 2.1), nicht die Satzstruktur.
