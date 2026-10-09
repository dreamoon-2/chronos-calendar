use serde::{Deserialize, Serialize};
use std::{collections::HashSet, sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Deserialize)]
pub struct Reminder {
    id: String,
    title: String,
    body: String,
    notify_at: u64,
    start_at: u64,
}

#[derive(Default, Serialize, Deserialize)]
struct Delivered(Vec<String>);

#[derive(Default)]
struct Queue { user_id: String, reminders: Vec<Reminder>, delivered: HashSet<String> }

#[derive(Default)]
pub struct ReminderService(Mutex<Queue>);

#[tauri::command]
pub fn set_reminders(user_id: String, reminders: Vec<Reminder>, state: State<'_, ReminderService>) -> Result<(), String> {
    let mut queue = state.0.lock().map_err(|error| error.to_string())?;
    queue.user_id = user_id;
    queue.reminders = reminders;
    Ok(())
}

#[tauri::command]
pub fn test_notification(app: AppHandle) -> Result<(), String> {
    app.notification().builder().title("Chronos 日程提醒")
        .body("测试成功，开启提醒后将在日程开始前通知你。").show().map_err(|error| error.to_string())
}

pub fn start(app: &AppHandle) {
    let app = app.clone();
    let file = app.path().app_config_dir().ok().map(|directory| directory.join("delivered-reminders.json"));
    if let Some(file) = &file {
        if let Ok(text) = std::fs::read_to_string(file) {
            if let Ok(delivered) = serde_json::from_str::<Delivered>(&text) {
                if let Ok(mut queue) = app.state::<ReminderService>().0.lock() {
                    queue.delivered = delivered.0.into_iter().collect();
                }
            }
        }
    }
    std::thread::spawn(move || loop {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        if let Ok(mut queue) = app.state::<ReminderService>().0.lock() {
            let due = queue.reminders.iter().filter(|reminder| {
                reminder.notify_at <= now && now <= reminder.start_at + 60_000 &&
                    !queue.delivered.contains(&format!("{}:{}", queue.user_id, reminder.id))
            }).cloned().collect::<Vec<_>>();
            let mut changed = false;
            for reminder in due {
                if app.notification().builder().title(&reminder.title).body(&reminder.body).show().is_ok() {
                    let key = format!("{}:{}", queue.user_id, reminder.id);
                    queue.delivered.insert(key);
                    changed = true;
                }
            }
            if queue.delivered.len() > 500 {
                // 仅保留近期计划对应的记录，避免本机去重文件无限增长。
                let active = queue.reminders.iter().map(|reminder| format!("{}:{}", queue.user_id, reminder.id)).collect::<HashSet<_>>();
                queue.delivered.retain(|key| active.contains(key));
            }
            if let Some(file) = file.as_ref().filter(|_| changed) {
                if let Some(directory) = file.parent() {
                    let _ = std::fs::create_dir_all(directory);
                }
                if let Ok(text) = serde_json::to_string(&Delivered(queue.delivered.iter().cloned().collect())) {
                    let _ = std::fs::write(file, text);
                }
            }
        }
        std::thread::sleep(Duration::from_secs(10));
    });
}
