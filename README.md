# Trading Journal — Crypto

Pełna aplikacja webowa do prowadzenia dziennika tradingowego. Dark mode, Firebase Firestore, logowanie Google.

## Funkcje

- Logowanie przez Google (Firebase Auth)
- Dane zapisywane w Firestore (osobne dla każdego użytkownika)
- Dashboard ze statystykami: P&L, Win Rate, Profit Factor, Avg R:R
- Equity Curve, wykres P&L na trade, rozkład setupów, miesięczny P&L
- Dziennik z wyszukiwaniem, filtrowaniem i sortowaniem
- Szczegółowy widok trade z linkiem do screenshota
- Auto-obliczanie P&L i R:R na podstawie Entry/SL/Exit/Size
- Export do CSV
- Zakładka Statystyki z Long vs Short breakdown

---

## Setup — Firebase

### 1. Utwórz projekt Firebase
Idź na [https://console.firebase.google.com](https://console.firebase.google.com) → **Add project**

### 2. Włącz Authentication
- **Authentication** → **Sign-in method** → włącz **Google**

### 3. Włącz Firestore
- **Firestore Database** → **Create database** → tryb **production**
- Po utworzeniu wejdź w **Rules** i wklej zawartość pliku `firestore.rules`

### 4. Pobierz konfigurację
- **Project Settings** (zębatka) → **Your apps** → **Web app** (`</>`)
- Skopiuj obiekt `firebaseConfig`

### 5. Wklej config do aplikacji
Otwórz `src/app.js` i podmień blok na górze:

```js
const firebaseConfig = {
  apiKey:            "TWOJ_API_KEY",
  authDomain:        "TWOJ_PROJECT.firebaseapp.com",
  projectId:         "TWOJ_PROJECT_ID",
  storageBucket:     "TWOJ_PROJECT.appspot.com",
  messagingSenderId: "TWOJ_SENDER_ID",
  appId:             "TWOJ_APP_ID"
};
```

---

## Deploy na Firebase Hosting

```bash
# Zainstaluj Firebase CLI
npm install -g firebase-tools

# Zaloguj się
firebase login

# Zainicjuj projekt (w folderze aplikacji)
firebase use --add   # wybierz swój projekt

# Deploy
firebase deploy
```

Aplikacja będzie dostępna pod adresem: `https://TWOJ_PROJECT.web.app`

---

## GitHub

```bash
git init
git add .
git commit -m "Initial commit - Trading Journal"
git remote add origin https://github.com/TWOJ_USERNAME/trading-journal.git
git push -u origin main
```

Możesz połączyć Firebase Hosting z GitHub (auto-deploy przy push):  
**Hosting** → **Connect to GitHub** w konsoli Firebase.

---

## Struktura projektu

```
trading-journal/
├── index.html          # Główny plik HTML
├── src/
│   ├── app.js          # Logika aplikacji + Firebase
│   └── styles.css      # Style
├── firestore.rules     # Reguły bezpieczeństwa Firestore
├── firebase.json       # Konfiguracja Firebase Hosting
└── README.md
```

## Kolumny dziennika

| Pole | Opis |
|------|------|
| Data | Data tradeu |
| Instrument | np. BTCUSDT.P |
| Kierunek | Long / Short |
| Wejście | Cena wejścia |
| Stop Loss | Poziom SL |
| Wyjście | Cena wyjścia |
| Wielkość | Wielkość pozycji (np. 0.043 BTC) |
| P&L ($) | Zysk/strata w USD (auto lub ręcznie) |
| R:R | Risk/Reward ratio (auto lub ręcznie) |
| Setup | Opis setupu, logika wejścia |
| Emocje | Stan emocjonalny podczas tradeu |
| Screenshot | URL do wykresu (TradingView itp.) |
| Przemyślenia | Post-trade analiza |
