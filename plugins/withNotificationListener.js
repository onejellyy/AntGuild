/**
 * Expo Config Plugin — Android NotificationListenerService
 *
 * EAS 빌드 시 아래 작업을 수행합니다:
 * 1. AndroidManifest.xml에 서비스 선언 추가
 * 2. Kotlin 소스 파일 3개 생성
 *    - BrokerNotificationListenerService.kt
 *    - NotificationTradeModule.kt
 *    - NotificationTradePackage.kt
 * 3. MainApplication.kt에 패키지 등록
 */

const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE = 'com.onejelly.millionwonrpg';
const PACKAGE_PATH = PACKAGE.split('.').join('/');

// ─── Kotlin 소스 ────────────────────────────────────────────────

const LISTENER_SERVICE = `
package ${PACKAGE}

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class BrokerNotificationListenerService : NotificationListenerService() {

    companion object {
        private val BROKER_PACKAGES = setOf(
            "com.tossinvest.android",
            "viva.republica.toss",
            "com.kakaopay.invest",
            "com.kakao.kakaopay",
            "com.kakaopay.app"
        )

        private var instance: BrokerNotificationListenerService? = null

        fun getActiveNotifications(): List<Map<String, Any>> {
            return instance?.getFiltered() ?: emptyList()
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        val pkg = sbn.packageName ?: return
        if (!BROKER_PACKAGES.contains(pkg)) return

        val extras = sbn.notification?.extras ?: return
        val title = extras.getString("android.title") ?: return
        val body = extras.getCharSequence("android.bigText")?.toString()
            ?: extras.getCharSequence("android.text")?.toString()
            ?: return
        val subText = extras.getCharSequence("android.subText")?.toString()

        NotificationTradeModule.sendEvent(
            sourcePackage = pkg,
            notificationKey = sbn.key ?: "",
            title = title,
            body = body,
            subText = subText,
            postedAt = sbn.postTime
        )
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {}

    private fun getFiltered(): List<Map<String, Any>> {
        return try {
            activeNotifications?.mapNotNull { sbn ->
                val pkg = sbn.packageName ?: return@mapNotNull null
                if (!BROKER_PACKAGES.contains(pkg)) return@mapNotNull null
                val extras = sbn.notification?.extras ?: return@mapNotNull null
                val title = extras.getString("android.title") ?: return@mapNotNull null
                val body = extras.getCharSequence("android.bigText")?.toString()
                    ?: extras.getCharSequence("android.text")?.toString()
                    ?: return@mapNotNull null
                val subText = extras.getCharSequence("android.subText")?.toString()
                buildMap {
                    put("sourcePackage", pkg)
                    put("notificationKey", sbn.key ?: "")
                    put("title", title)
                    put("body", body)
                    put("postedAt", sbn.postTime)
                    if (subText != null) put("subText", subText)
                }
            } ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
`.trimStart();

const TRADE_MODULE = `
package ${PACKAGE}

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationTradeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: NotificationTradeModule? = null

        fun sendEvent(
            sourcePackage: String,
            notificationKey: String,
            title: String,
            body: String,
            subText: String?,
            postedAt: Long
        ) {
            instance?.emitToJS(sourcePackage, notificationKey, title, body, subText, postedAt)
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "NotificationTradeModule"

    private fun emitToJS(
        sourcePackage: String,
        notificationKey: String,
        title: String,
        body: String,
        subText: String?,
        postedAt: Long
    ) {
        val params = Arguments.createMap().apply {
            putString("sourcePackage", sourcePackage)
            putString("notificationKey", notificationKey)
            putString("title", title)
            putString("body", body)
            subText?.let { putString("subText", it) }
            putDouble("postedAt", postedAt.toDouble())
        }
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("BrokerNotificationReceived", params)
        } catch (e: Exception) {
            // JS bridge not ready
        }
    }

    @ReactMethod
    fun isNotificationAccessEnabled(promise: Promise) {
        promise.resolve(checkAccess(reactContext))
    }

    @ReactMethod
    fun openNotificationAccessSettings() {
        val intent = android.content.Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun getActiveNotifications(promise: Promise) {
        try {
            val list = BrokerNotificationListenerService.getActiveNotifications()
            val result = Arguments.createArray()
            for (item in list) {
                val map = Arguments.createMap()
                map.putString("sourcePackage", item["sourcePackage"] as String)
                map.putString("notificationKey", item["notificationKey"] as String)
                map.putString("title", item["title"] as String)
                map.putString("body", item["body"] as String)
                (item["subText"] as? String)?.let { map.putString("subText", it) }
                map.putDouble("postedAt", (item["postedAt"] as Long).toDouble())
                result.pushMap(map)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.resolve(Arguments.createArray())
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun checkAccess(context: Context): Boolean {
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        ) ?: return false
        if (TextUtils.isEmpty(flat)) return false
        return flat.split(":").any {
            val cn = ComponentName.unflattenFromString(it)
            cn?.packageName == context.packageName
        }
    }
}
`.trimStart();

const TRADE_PACKAGE = `
package ${PACKAGE}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NotificationTradePackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
        listOf(NotificationTradeModule(context))

    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`.trimStart();

// ─── Plugin ─────────────────────────────────────────────────────

function withNotificationListener(config) {
  // 1. AndroidManifest.xml — 서비스 등록
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    if (!application.service) application.service = [];

    const serviceName = '.BrokerNotificationListenerService';
    const alreadyAdded = application.service.some(
      (s) => s.$?.['android:name'] === serviceName,
    );

    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:label': '@string/app_name',
          'android:permission':
            'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });

  // 2. Kotlin 소스 파일 생성
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const javaDir = path.join(
        config.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE_PATH.split('/'),
      );

      fs.mkdirSync(javaDir, { recursive: true });

      const write = (filename, content) => {
        const filePath = path.join(javaDir, filename);
        fs.writeFileSync(filePath, content, 'utf8');
      };

      write('BrokerNotificationListenerService.kt', LISTENER_SERVICE);
      write('NotificationTradeModule.kt', TRADE_MODULE);
      write('NotificationTradePackage.kt', TRADE_PACKAGE);

      return config;
    },
  ]);

  // 3. MainApplication.kt — 패키지 등록
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('NotificationTradePackage')) return config;

    // Expo SDK 55 / RN 0.83 패턴: ExpoReactHostFactory + PackageList.apply { }
    // MainApplication.kt 실제 구조:
    //   PackageList(this).packages.apply {
    //     // add(MyReactNativePackage())
    //   }
    if (/(PackageList\(this\)\.packages\.apply\s*\{)/.test(contents)) {
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        `$1\n          add(NotificationTradePackage())`,
      );
    } else {
      // 구버전 폴백: val packages = PackageList(this).packages + return packages
      contents = contents.replace(
        /(val packages = PackageList\(this\)\.packages[\s\S]*?)(return packages)/,
        (_, before, ret) =>
          `${before}      packages.add(NotificationTradePackage())\n      ${ret}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withNotificationListener;
