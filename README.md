# Cafydia Lite

Este proyecto incluye un **Makefile** que simplifica las tareas comunes de construcción, instalación y limpieza de la aplicación Android.

## Requisitos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:

- **Node.js** y **npm**  
  ```bash
  $ node -v
  v18.19.0

  $ npm -v
  9.2.0
- **Java Development Kit** (JDK 17 de Oracle). Versión recomendada: `jdk-17.0.12_linux-x64_bin.deb`
- **Gradle**
```bash
$ android/gradlew -v

------------------------------------------------------------
Gradle 8.10.2
------------------------------------------------------------

Build time:    2024-09-23 21:28:39 UTC
Revision:      415adb9e06a516c44b391edff552fd42139443f7

Kotlin:        1.9.24
Groovy:        3.0.22
Ant:           Apache Ant(TM) version 1.10.14 compiled on August 16 2023
Launcher JVM:  11.0.26 (Oracle Corporation 11.0.26+7-LTS-187)
Daemon JVM:    /usr/lib/jvm/jdk-11.0.26-oracle-x64 (no JDK specified, using current Java home)
OS:            Linux 6.1.0-30-amd64 amd64
```

## Uso rápido (TL;DR)
Ejecuta los siguientes comandos para compilar e instalar la aplicación en un dispositivo Android o emulador:

```bash
make build    # Compila la aplicación (siempre limpia antes de compilar)
make install  # Instala la APK en un dispositivo/emulador conectado
```

---

## Comandos Disponibles

### **`make clean`**
Limpia los archivos de construcción generados previamente por Gradle.

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
1. Ejecuta una limpieza (make clean) antes de compilar.
2. Genera el paquete de JavaScript (`index.android.bundle`) necesario para la aplicación.
3. Construye el APK en modo **debug**.
4. Coloca el APK en el directorio:
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
1. Construye el APK:
   ```bash
   make build
   ```
2. Instala el APK en tu dispositivo/emulador:
   ```bash
   make install
   ```
3. Ejecuta la aplicación desde el emulador o dispositivo conectado.
