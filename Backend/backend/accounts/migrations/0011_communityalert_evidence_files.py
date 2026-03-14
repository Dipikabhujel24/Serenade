from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_userprofile_avatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="communityalert",
            name="audio_evidence",
            field=models.FileField(blank=True, null=True, upload_to="community_alerts/audio/"),
        ),
        migrations.AddField(
            model_name="communityalert",
            name="video_evidence",
            field=models.FileField(blank=True, null=True, upload_to="community_alerts/video/"),
        ),
    ]
