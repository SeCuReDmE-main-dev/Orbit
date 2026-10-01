"""Prepare credential-free v2 artifacts; historical v1 notebooks stay unchanged."""
import sys
from prepare_kaggle_campaign_v2 import main as prepare_v2


def main():
    if '--legacy-v1' in sys.argv:
        raise RuntimeError('HISTORICAL_V1_IS_CLOSED_USE_ARCHIVED_SOURCE_AND_NOTEBOOKS')
    sys.argv = [sys.argv[0], '--suite', 'D', *sys.argv[1:]]
    prepare_v2()


if __name__ == '__main__':
    main()
