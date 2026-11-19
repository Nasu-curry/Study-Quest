# STUDY QUEST — 学習管理RPG

学習をRPGのキャラクター育成のように管理するWebアプリです。HTML / CSS / JavaScript のみで動作し、データはブラウザの LocalStorage に保存されます（サーバー不要）。

## 公開手順（GitHub Pages）
1. このフォルダの中身（`index.html` `style.css` `script.js` `README.md`）をリポジトリのルートに置いて push
2. リポジトリの **Settings → Pages** で、Source を `Deploy from a branch`、Branch を `main` / `/ (root)` にして保存
3. 表示された URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）にアクセス

パスはすべて相対パス、画面遷移は `#` ハッシュなので、サブパス配下でもそのまま動作します。ローカルでは `index.html` を開くだけで動きます。

## 設計
- 画面: ホーム / カテゴリー / スキル詳細 / 学習記録 / 昇格試験 / 設定（ハッシュルーティング）
- データ: `{settings, cats, skills, logs}` を1つのJSONとして LocalStorage（キー `studyquest.v1`）に保存
- EXP: 学習時間×分あたりEXP ＋ 問題数×問あたりEXP。手動加減算も可（履歴に残ります）
- 必要EXP: 設定のデフォルト値を使い、スキルごとに個別上書き可能
- 昇格: 必要EXP到達で試験が解放 → 問題数・正解数を入力し、合格基準以上で昇格。超過EXPは次ランクに繰り越し。不合格はランク維持で再挑戦可
- 履歴: 学習・手動・試験・昇格をすべて保持。学習記録の編集・削除はEXPに反映

## データ管理
設定画面から JSON のエクスポート / インポート / 初期化ができます。ブラウザを変える前にエクスポートしておくと安全です。
