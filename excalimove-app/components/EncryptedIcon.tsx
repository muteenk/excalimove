import { Tooltip } from "@excalimove/excalimove/components/Tooltip";
import { shield } from "@excalimove/excalimove/components/icons";
import { useI18n } from "@excalimove/excalimove/i18n";

export const EncryptedIcon = () => {
  const { t } = useI18n();

  return (
    <span className="encrypted-icon tooltip" aria-label={t("encrypted.link")}>
      <Tooltip label={t("encrypted.tooltip")} long={true}>
        {shield}
      </Tooltip>
    </span>
  );
};
