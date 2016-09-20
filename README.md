# iitc-plugin-keys-list
Export Keys list

## 使い方（一例）

前提として、IITCのセットアップが完了していること。

### 前準備

依存プラグインをインストールする。 http://iitc.jonatkins.com/

* Keys
* Keys on map
* Bookmarks for maps and portals
* (cache-details-on-map) 無くてもOK

モバイル版の場合は、設定で上記プラグインを有効にしておく。

### インストール

以下のURLをクリックすると、IITCが反応してインストールできる。

https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js

モバイル版の場合は、設定でプラグインを有効にしておく。

### ポータルキーの本数とポータル名を入力する

* 入力したいポータルを、ブックマークする（☆マーク クリック）
* キーの数を入力する（＋マーク クリック）
* ブックマークは、フォルダで分けて分類すると、わかりやすくなります
** 地域別、カプセルの色別、等。お好きなように！

以上を管理したい対象のキー全てに行う（手入力です！）。

### KeysList でCSV出力

Infoパネルの「KeysList」をクリック→ダイアログ表示される。
「Export CSV」でダウンロード。

### Googleマイマップにインポート

1. https://www.google.com/maps/d/home
2. 「＋新しい地図を作成」
3. インポート。ファイルをアップロード（先ほどのCSVファイル）
4. 目印を配置する列の選択→latlng（緯度／経度）
5. マーカーのタイトルとして使用する列→name
6. スタイルの変更。均一スタイルを、データ列別のスタイルにする→memo

以上で完成。
