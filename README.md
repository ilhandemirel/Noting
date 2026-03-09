# Noting App

Uygulamayı kendi bilgisayarınızda çalıştırmak ve geliştirmek için aşağıdaki adımları takip edebilirsiniz.

## 📌 Ön Koşullar

1. Bilgisayarınızda **[Node.js](https://nodejs.org/)** yüklü olmalıdır.
2. Uygulamayı test edebilmek için cep telefonunuzda **[Expo Go](https://expo.dev/go)** uygulaması yüklü olmalıdır.
3. Kodu düzenlemek için **VS Code** (veya benzeri bir editör) tavsiye edilir.

## 🛠️ 1. Kurulum (Paketlerin İndirilmesi)

1. Proje ana klasörünü (`Noting`) VS Code ile açın.
2. Yeni bir terminal açın ve gerekli tüm kütüphaneleri indirmek için şu komutu çalıştırın:
   ```bash
   npm install
   ```

## 🗄️ 2. Yerel Veritabanını (PocketBase) Başlatma

Uygulamanın veritabanı olarak **PocketBase** kullanılmaktadır. Kendi bilgisayarınızda yerel bir PocketBase sunucusu başlatmanız gerekir.

1. VS Code terminalinde `pocketbase` klasörüne girin:
   ```bash
   cd pocketbase
   ```
2. PocketBase sunucusunu tüm IP'lerden erişilebilir (telefonunuzun da bağlanabilmesi için) şekilde başlatın (Windows için):
   ```bash
   ./pocketbase serve --http="0.0.0.0:8090"
   ```

*(Dikkat: Bu sekme açık kalmalı, kapatırsanız veritabanı kapanır. Yeni işlemler için VS Code terminalinde yeni bir sekme `+` açın).*

### Veritabanı Koleksiyonlarını Oluşturma (İlk Kurulum İçin)
Eğer veritabanındaki tablolar (notes, folders vb.) henüz oluşmadıysa, projede bulunan kurulum dosyasını çalıştırarak veritabanını hazır hale getirebilirsiniz. Bunun için yeni bir terminal sekmesi açın, proje ana dizinindeyken:
```bash
node setup-collections.js "http://127.0.0.1:8090" "admin@noting.com" "sifreniz123"
```
*(Yukarıdaki email ve şifre komuttaki varsayılan yönetici (admin) bilgileri için temsilidir, gerekirse PocketBase admin panelinden `http://localhost:8090/_/` oluşturabilirsiniz.)*

## 🔗 3. Uygulamanın Sizin Veritabanınıza Bağlanması

Uygulamanın sizin yerel bilgisayarınızdaki PocketBase'e bağlandığından emin olmalıyız.

1. Bilgisayarınızın yerel WiFi veya Ağ **IP Adresini** öğrenin.
   - Windows terminalinde: `ipconfig` yazıp IPv4 Adresine (Örn: `192.168.1.55`) bakın.
2. Proje içinde `utils/constants.ts` dosyasını bulun ve açın.
3. `POCKETBASE_URL` değişkenindeki IP'yi, kendi IP adresinizle değiştirin:
   ```typescript
   export const POCKETBASE_URL = 'http://192.168.1.55:8090'; // Kendi IP'nizi yazın
   ```

## 🚀 4. Uygulamayı Çalıştırma

1. Proje ana dizinindeyken (Noting klasörü) terminalde şu komutu çalıştırın:
   ```bash
   npx expo start
   ```
2. Ekranda bir **QR Kod** belirecektir.
3. Telefonunuzdaki **Expo Go** uygulamasını açıp bu QR kodu okutun (iPhone'lar için direkt kameradan da okutabilirsiniz).
4. Uygulama telefonunuzda açılacak ve kodda yaptığınız her değişiklik anında telefonunuza yansıyacaktır! 🎉

---

**Not:** Expo ve PocketBase sunucusu çalışırken bilgisayarınız ile telefonunuzun **aynı WiFi ağına** bağlı olduğundan emin olun.
