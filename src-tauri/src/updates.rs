use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Deserialize)]
struct Asset { name: String }

#[derive(Deserialize)]
struct Release { assets: Vec<Asset>, draft: bool, prerelease: bool }

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReleaseStatus { Ready, Unpublished, Incomplete }

// 区分“尚未发布”和网络失败，不把检查失败误报为“已是最新版本”。
#[tauri::command]
pub async fn github_release_status() -> Result<ReleaseStatus, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent(concat!("Chronos-Calendar/", env!("CARGO_PKG_VERSION")))
        .build().map_err(|_| "无法建立更新检查连接".to_string())?;
    let response = client.get("https://api.github.com/repos/dreamoon-2/chronos-calendar/releases/latest")
        .header("Accept", "application/vnd.github+json")
        .send().await.map_err(|_| "无法连接 GitHub，请检查网络后重试".to_string())?;
    if response.status() == reqwest::StatusCode::NOT_FOUND { return Ok(ReleaseStatus::Unpublished); }
    if !response.status().is_success() {
        return Err(format!("GitHub 暂时无法检查更新（HTTP {}），请稍后重试", response.status().as_u16()));
    }
    let release = response.json::<Release>().await.map_err(|_| "GitHub 版本信息格式无效".to_string())?;
    Ok(if !release.draft && !release.prerelease && release.assets.iter().any(|asset| asset.name == "latest.json") {
        ReleaseStatus::Ready
    } else { ReleaseStatus::Incomplete })
}

#[cfg(test)]
mod tests {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use minisign_verify::{PublicKey, Signature};
    use std::{fs, path::Path};

    // 必须在签名打包后运行。验证实际产物与应用公钥一致，并拒绝篡改包。
    #[test]
    #[ignore = "requires a signed Windows release installer"]
    fn verify_signed_release() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let config: serde_json::Value = serde_json::from_str(&fs::read_to_string(root.join("tauri.conf.json")).unwrap()).unwrap();
        let version = config["version"].as_str().unwrap();
        let installer = root.join(format!("target/release/bundle/nsis/Chronos Calendar_{}_x64-setup.exe", version));
        let bytes = fs::read(&installer).expect("missing release installer");
        let signature = fs::read_to_string(format!("{}.sig", installer.display())).expect("missing updater signature");
        let public_key = String::from_utf8(STANDARD.decode(config["plugins"]["updater"]["pubkey"].as_str().unwrap()).unwrap()).unwrap();
        let signature = String::from_utf8(STANDARD.decode(signature.trim()).unwrap()).unwrap();
        let public_key = PublicKey::decode(&public_key).unwrap();
        let signature = Signature::decode(&signature).unwrap();
        public_key.verify(&bytes, &signature, true).expect("installer does not match application public key");
        assert!(signature.trusted_comment().split('\t').any(|field| field == format!("version:{}", version)), "signed version differs from release version");
        let mut corrupt = bytes;
        corrupt[0] ^= 1;
        assert!(public_key.verify(&corrupt, &signature, true).is_err(), "tampered installer must be rejected");
    }
}
