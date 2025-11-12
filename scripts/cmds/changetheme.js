module.exports = {
        config: {
                name: "changetheme",
                aliases: ["theme", "settheme"],
                version: "2.0.0",
                author: "NeoKEX",
                countDown: 5,
                role: 0,
                description: {
                        vi: "Thay đổi theme của nhóm/tin nhắn sử dụng AI",
                        en: "Change group/DM theme using AI"
                },
                category: "group",
                guide: {
                        vi: "   {pn} <mô tả> - Thay đổi theme dựa trên mô tả của bạn\n   Ví dụ: {pn} romantic sunset\n   {pn} ocean vibes\n   {pn} birthday party\n   {pn} vibrant purple colors",
                        en: "   {pn} <description> - Change theme based on your description\n   Example: {pn} romantic sunset\n   {pn} ocean vibes\n   {pn} birthday party\n   {pn} vibrant purple colors"
                }
        },

        langs: {
                vi: {
                        missingPrompt: "Vui lòng nhập mô tả theme bạn muốn",
                        thinking: "◈ Đang tạo theme AI dựa trên mô tả của bạn...",
                        success: "◆ Đã thay đổi theme thành công!\n◈ Tên theme: %1\n◈ Mô tả: %2",
                        error: "◆ Đã xảy ra lỗi khi thay đổi theme: %1",
                        notGroup: "Lệnh này chỉ có thể sử dụng trong nhóm hoặc tin nhắn riêng",
                        noPermission: "Bot không có quyền thay đổi theme trong nhóm này",
                        noThemes: "◆ Không thể tạo theme với mô tả này. Vui lòng thử mô tả khác!",
                        featureUnavailable: "◆ Tính năng tạo theme AI không khả dụng cho tài khoản này.\n◈ Đây là hạn chế từ Facebook dựa trên khu vực/quyền tài khoản của bạn.\n◈ Bạn vẫn có thể sử dụng các theme tiêu chuẩn có sẵn!"
                },
                en: {
                        missingPrompt: "Please enter a theme description",
                        thinking: "◈ Creating AI theme based on your description...",
                        success: "◆ Theme changed successfully!\n◈ Theme name: %1\n◈ Description: %2",
                        error: "◆ An error occurred while changing theme: %1",
                        notGroup: "This command can only be used in groups or DMs",
                        noPermission: "Bot doesn't have permission to change theme in this group",
                        noThemes: "◆ Could not create a theme with this description. Please try a different description!",
                        featureUnavailable: "◆ AI theme generation is not available for this account.\n◈ This is a Facebook restriction based on your account's region/permissions.\n◈ You can still use all standard themes!"
                }
        },

        onStart: async function ({ args, message, event, api, getLang }) {
                const { threadID } = event;

                const userPrompt = args.join(" ");
                if (!userPrompt) {
                        return message.reply(getLang("missingPrompt"));
                }

                const thinkingMsg = await message.reply(getLang("thinking"));

                try {
                        const themes = await api.createAITheme(userPrompt);

                        if (!themes || themes.length === 0) {
                                try {
                                        await message.unsend(thinkingMsg.messageID);
                                } catch (e) {}
                                return message.reply(getLang("noThemes"));
                        }

                        const selectedTheme = themes[0];

                        await api.setThreadThemeMqtt(threadID, selectedTheme.id);
                        
                        try {
                                await message.unsend(thinkingMsg.messageID);
                        } catch (e) {}
                        
                        return message.reply(getLang("success", 
                                selectedTheme.accessibility_label || selectedTheme.name || "Custom AI Theme", 
                                userPrompt
                        ));

                } catch (error) {
                        try {
                                await message.unsend(thinkingMsg.messageID);
                        } catch (e) {}
                        
                        if (error.code === 'FEATURE_UNAVAILABLE') {
                                return message.reply(getLang("featureUnavailable"));
                        }
                        
                        return message.reply(getLang("error", error.message));
                }
        }
};
