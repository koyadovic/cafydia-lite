# Cafydia Lite

## Autoajuste

En Configuración puedes activar el autoajuste. Cada activación inicia una sesión nueva;
las comidas y mediciones de sesiones anteriores permanecen en la base de datos SQLite
local. Al confirmar una recomendación, indica la dosis de rápida que realmente te
administraste y pulsa el botón al comenzar a comer. La app pedirá la glucosa 90 minutos
después. La lista de pendientes muestra tanto la hora de la comida como la hora de esa
glucosa. Puedes consultar en el sensor el valor correspondiente a esa hora e introducirlo
más tarde; la base de datos guarda por separado la hora de la medición y la de registro.
Si Android no permite mostrar el aviso, la medición seguirá visible en «Glucosas pendientes».

Si dejas vacía la glucosa previa, se usa y se registra 100 mg/dL; también se guarda
si ese valor se introdujo o se asumió. Cualquier valor
positivo introducido se aplica a la misma fórmula de corrección con `fc`, tanto si
está por debajo como por encima de 100 mg/dL.

La propuesta de `m`, los tres bolos base y `fc` se recalcula al introducir cada
medición, usando solo comidas de la sesión activa. La propuesta permanece
separada de los parámetros activos hasta pulsar «Aplicar valores propuestos». Si los
datos aún no permiten separar los parámetros, la app avisa de que la propuesta es
preliminar. Una glucosa a los 90 minutos no representa una indicación de
corrección inmediata.

El primer modelo ofrece una propuesta desde la primera medición utilizable, tomando
los parámetros actuales como punto de partida. Indica cuándo los datos todavía no
permiten separar bien los parámetros; no impone un mínimo fijo de comidas ni un
límite porcentual al cambio propuesto. Los bolos base `b` pueden ser negativos.

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
Este comando genera un APK no depurable listo para ser instalado en un emulador o dispositivo.

#### Uso:
```bash
make build
```

#### ¿Qué hace?
1. Ejecuta una limpieza (make clean) antes de compilar.
2. Genera el paquete de JavaScript (`index.android.bundle`) necesario para la aplicación.
3. Construye el APK en modo **release**.
4. Coloca el APK en el directorio:
   ```
   android/app/build/outputs/apk/release/app-release.apk
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
