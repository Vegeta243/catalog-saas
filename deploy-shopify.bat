@echo off
title Shopify App Deploy - EcomPilot Elite
color 0B
echo.
echo  =========================================
echo   SHOPIFY APP DEPLOY - EcomPilot Elite
echo  =========================================
echo.
echo  Ce script va deployer votre app Shopify
echo  sur https://www.ecompilotelite.com
echo.
echo  ETAPES :
echo  1. Appuyez sur ENTREE quand demande
echo  2. Votre navigateur va s'ouvrir
echo  3. Connectez-vous avec elliottshilenge5@gmail.com
echo  4. Entrez le code affiche ici
echo.
echo  =========================================
echo.
cd /d "C:\Users\Admin\Documents\catalog-saas"
shopify app deploy --allow-updates
echo.
echo  =========================================
echo  Appuyez sur une touche pour fermer...
pause > nul
