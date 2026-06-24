import sys
import os

# Resolve backend path both locally and on Vercel (/var/task/backend)
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_here, '..', 'backend')
sys.path.insert(0, os.path.normpath(_backend))

from bot import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")
