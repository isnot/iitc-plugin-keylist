# iitc-plugin-keys-list
Export Keys list

## 使い方（一例）

前提として、IITCのセットアップが完了していること。

### 前準備

依存プラグインをインストールする。
Keys, Keys on map, Bookmarks for maps and portals, (cache-details-on-map)

− http://iitc.jonatkins.com/

モバイル版の場合は、設定で上記プラグインを有効にしておく。

### インストール

以下のURLをクリックすると、IITCが反応してインストールできる。
https://github.com/isnot/iitc-plugin-keys-list/raw/master/plugins/keys-list.user.js

モバイル版の場合は、設定でプラグインを有効にしておく。

### ポータルキーの本数とポータル名を入力する

− 入力したいポータルを、ブックマークする（☆マーク クリック）。
ｰ キーの数を入力する（＋マーク クリック）

以上を管理したい対象のキー全てに行う（手入力です！）

### KeysList でCSVに出力

Infoパネルの「KeysList」をクリック→ダイアログ表示される。
「Export CSV」でダウンロード

### Googleマイマップにインポート

1. https://www.google.com/maps/d/home
2. 「＋新しい地図を作成」
3. インポート
4. ファイルをアップロード（先ほどのCSVファイル）
5. 目印を配置する列の選択→latlng（緯度／経度）
6. マーカーのタイトルとして使用する列→name
7. スタイルの変更。均一スタイルを、データ列別のスタイルにする→memo


以上で完成。
