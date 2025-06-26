# 🚀 AWS Lightsail Deployment Instructions for TheDANG Homepage

## 📋 **Deployment Options**

### **Option 1: Automatic Deployment (Recommended)**
When you push to the `main` branch, GitHub Actions will automatically deploy to neture.co.kr.

```bash
# Commit and push your changes
git add .
git commit -m "Update TheDANG homepage"
git push origin main
```

**What happens automatically:**
- ✅ Build React app with Node.js 20
- ✅ Deploy to AWS Lightsail (13.125.144.8)
- ✅ Update neture.co.kr
- ✅ Restart Nginx and PM2 services

---

### **Option 2: Manual Scripts**

#### **Quick Deploy** (Fastest)
```bash
cd services/main-site
chmod +x ../../scripts/quick-deploy.sh
../../scripts/quick-deploy.sh
```

#### **Full Deploy** (Most reliable)
```bash
cd services/main-site
chmod +x ../../scripts/deploy-to-lightsail.sh
../../scripts/deploy-to-lightsail.sh
```

#### **Configure Nginx** (One-time setup)
```bash
chmod +x scripts/configure-nginx-spa.sh
scripts/configure-nginx-spa.sh
```

---

## 🛠️ **Manual SSH Deployment**

If scripts don't work, deploy manually via SSH:

### **Step 1: Build Locally**
```bash
cd services/main-site
npm run build
```

### **Step 2: Upload to Server**
```bash
# Upload files
rsync -avz --delete dist/ ubuntu@13.125.144.8:/tmp/new-dist/

# SSH into server
ssh ubuntu@13.125.144.8
```

### **Step 3: Deploy on Server**
```bash
# Backup current files
sudo cp -r /var/www/html /var/www/html.backup.$(date +%Y%m%d_%H%M%S)

# Deploy new files
sudo rm -rf /var/www/html/*
sudo mv /tmp/new-dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/

# Restart services
sudo systemctl restart nginx
pm2 restart web-app || pm2 serve /var/www/html 3000 --name "web-app" --spa
```

---

## 🔧 **Server Configuration**

### **Current Setup:**
- **Server**: AWS Lightsail Ubuntu (13.125.144.8)
- **Domain**: neture.co.kr
- **Web Root**: `/var/www/html`
- **Services**: Nginx (primary) + PM2 (backup)
- **Ports**: 80 (Nginx), 3000 (PM2)

### **File Locations:**
```
/var/www/html/           # Website files
/home/ubuntu/o4o-platform/  # Git repository
/etc/nginx/sites-available/default  # Nginx config
```

### **Service Commands:**
```bash
# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# PM2
pm2 status
pm2 restart web-app
pm2 logs web-app

# Check website
curl -I http://localhost/
curl -I https://neture.co.kr/
```

---

## 🎯 **What Gets Deployed**

### **TheDANG Homepage Features:**
- ✅ **Modern Design**: TheDANG.co.kr inspired clean layout
- ✅ **Service Cards**: 4 business modules with status
- ✅ **Hero Section**: Korean branding and messaging
- ✅ **Navigation**: Professional header with login
- ✅ **SPA Routing**: React Router with proper fallbacks
- ✅ **Mobile Responsive**: TailwindCSS responsive design

### **Technical Stack:**
- ✅ **React 19**: Latest React features
- ✅ **Vite 6**: Fast build and dev experience  
- ✅ **TypeScript**: 100% type safety
- ✅ **TailwindCSS 4**: Modern utility-first styling
- ✅ **Motion**: React 19 compatible animations
- ✅ **TipTap v2.22**: Rich text editor integration

---

## ⚠️ **Troubleshooting**

### **If site shows "Vite + React + TS":**
1. Check if build completed: `ls -la dist/`
2. Check server files: `ssh ubuntu@13.125.144.8 "ls -la /var/www/html/"`
3. Restart services: Run deploy script again

### **If deployment fails:**
```bash
# Check server status
ssh ubuntu@13.125.144.8 "sudo systemctl status nginx"

# Check PM2 status  
ssh ubuntu@13.125.144.8 "pm2 status"

# Check disk space
ssh ubuntu@13.125.144.8 "df -h"

# Check logs
ssh ubuntu@13.125.144.8 "sudo journalctl -u nginx -f"
```

### **Emergency Rollback:**
```bash
ssh ubuntu@13.125.144.8
sudo cp -r /var/www/html.backup.* /var/www/html/
sudo systemctl restart nginx
```

---

## 🌐 **Verification**

After deployment, verify these URLs:

- ✅ **Main Site**: https://neture.co.kr
- ✅ **Direct IP**: http://13.125.144.8  
- ✅ **Health Check**: https://neture.co.kr/health
- ✅ **SPA Routes**: https://neture.co.kr/auth/login

### **Expected Homepage:**
1. **Header**: "o4o-Platform" with blue theme
2. **Hero**: "통합 비즈니스 플랫폼" title
3. **Service Cards**: E-commerce, Digital Signage, Crowdfunding, Forum
4. **Design**: Clean, professional, mobile-responsive

---

## 📞 **Support**

If you encounter deployment issues:

1. **Check GitHub Actions**: Look for failed workflows
2. **Review logs**: SSH to server and check service logs  
3. **Verify build**: Ensure `npm run build` works locally
4. **Check permissions**: Ensure SSH key has proper access

**Files for reference:**
- 📁 `/scripts/deploy-to-lightsail.sh` - Full deployment
- 📁 `/scripts/quick-deploy.sh` - Fast deployment  
- 📁 `/scripts/configure-nginx-spa.sh` - Nginx setup
- 📁 `/.github/workflows/deploy-web-improved.yml` - Auto deployment