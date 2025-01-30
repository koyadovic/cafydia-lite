# CafydiaLite - Instrucciones de Uso del Makefile

Este proyecto incluye un **Makefile** que simplifica las tareas comunes de construcción, instalación y limpieza de la aplicación Android.

Para comenzar y tener todo listo instala todo con `npm i`. Necesario el JDK 17 de oracle.

A continuación, se explican los comandos disponibles:

---

## Comandos Disponibles

### **`make clean`**
Este comando limpia los archivos de construcción generados previamente por Gradle.

#### Uso:
```bash
make clean
```

#### ¿Qué hace?
- Elimina los archivos temporales y de compilación.
- Asegura un entorno limpio para futuras construcciones.

---

### **`make build`**
Este comando genera un **APK debug** listo para ser instalado en un emulador o dispositivo.

#### Uso:
```bash
make build
```

#### ¿Qué hace?
1. Genera el paquete de JavaScript (`index.android.bundle`) necesario para la aplicación.
2. Construye el APK en modo **debug**.
3. Coloca el APK en el directorio:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

#### Notas:
- Asegúrate de que los directorios necesarios existen antes de ejecutar este comando.
- Este paso puede tardar unos minutos dependiendo de tu entorno.

---

### **`make install`**
Este comando instala el APK generado en un emulador o dispositivo conectado mediante `adb`.

#### Uso:
```bash
make install
```

#### ¿Qué hace?
- Usa `adb` (Android Debug Bridge) para instalar el APK en el dispositivo conectado.
- Reinstala el APK si ya está presente, usando la opción `-r`.

#### Requisitos:
- Un dispositivo físico o un emulador debe estar conectado y visible mediante `adb devices`.

---

## Flujo de Trabajo Recomendado
1. Limpia cualquier archivo de construcción previo:
   ```bash
   make clean
   ```
2. Construye el APK:
   ```bash
   make build
   ```
3. Instala el APK en tu dispositivo/emulador:
   ```bash
   make install
   ```
4. Ejecuta la aplicación desde el emulador o dispositivo conectado.

---

Si tienes alguna pregunta o encuentras problemas durante estos pasos, no dudes en pedir ayuda. ¡Feliz desarrollo! 😊

