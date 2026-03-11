# Noting - Arkadaşım İçin Kurulum Rehberi 🚀

Selam! Bu rehber, Noting projesini kendi bilgisayarında nasıl çalıştıracağını ve evdeki sunucuya nasıl bağlanacağını adım adım anlatır.

## 1. Tailscale Kurulumu ve Erişim (Kritik)
Veri tabanımız evdeki güvenli sunucuda olduğu için önce o ağa katılman gerekiyor:
- [Tailscale](https://tailscale.com/download) uygulamasını indir ve kur.
- Sana gönderdiğim davet linkini kabul et.
- Tailscale açık olduğunda sunucunun IP'sine (`100.125.93.57`) erişebiliyor olmalısın.

## 2. Projeyi Klonla ve Bağımlılıkları Kur
```bash
git clone https://github.com/ilhandemirel/Noting.git
cd Noting
npm install
```

## 3. Veri Tabanı Bağlantısı (.env)
Proje klasörünün ana dizinine `.env` isimli bir dosya oluştur ve şu satırı yapıştır:
```text
EXPO_PUBLIC_PB_URL=http://100.125.93.57:8090
```
Bu dosya sayesinde uygulaman benim evdeki sunucuya bağlanacak.

## 4. Uygulamayı Çalıştır
```bash
# Web için
npm run web

# Android için (Emülatör veya USB ile bağlı cihaz gereklidir)
npm run android
```

## 5. PocketBase Admin Paneli (Veri Tabanına Tam Erişim)
Veri tabanını tarayıcıdan yönetmek için:
- **Link:** [http://100.125.93.57:8090/_/](http://100.125.93.57:8090/_/)
- **E-posta:** (Bunu sana özelden göndereceğim)
- **Şifre:** (Bunu sana özelden göndereceğim)

> [!NOTE]
> Bu panelden tüm notlara ve kullanıcılara müdahale edebilirsin.


